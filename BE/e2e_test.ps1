$ErrorActionPreference = "Stop"
$base = "http://localhost:7040"
$pass = "Admin#Test123"
$script:passCount = 0
$script:failCount = 0

function Check($label, $condition, $detail = "") {
  if ($condition) { $script:passCount++; Write-Host ("  PASS  " + $label) -ForegroundColor Green }
  else { $script:failCount++; Write-Host ("  FAIL  " + $label + "  " + $detail) -ForegroundColor Red }
}

function Call($session, $method, $path, $body = $null) {
  $params = @{ Uri = "$base$path"; Method = $method; WebSession = $session; UseBasicParsing = $true }
  if ($body -ne $null) {
    $params.Body = ($body | ConvertTo-Json -Depth 6)
    $params.ContentType = "application/json"
  }
  try {
    $r = Invoke-WebRequest @params
    $j = $r.Content | ConvertFrom-Json
    return @{ status = $r.StatusCode; body = $j }
  } catch {
    $resp = $_.Exception.Response
    $code = 0; $content = ""
    if ($resp) { $code = [int]$resp.StatusCode; try { $sr = New-Object IO.StreamReader($resp.GetResponseStream()); $content = $sr.ReadToEnd() } catch {} }
    $j = $null
    if ($content) { try { $j = $content | ConvertFrom-Json } catch {} }
    return @{ status = $code; body = $j; raw = $content }
  }
}

function Login($email, $password) {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $r = Call $s "POST" "/auth/login" @{ emailOrUsername = $email; password = $password }
  return @{ session = $s; result = $r }
}

# ---------------------------------------------------------------------------
# Make the suite replayable: wipe artefacts from any previous run. Done through
# the public API so it also exercises the delete paths.
# ---------------------------------------------------------------------------
Write-Host "Pre-run cleanup" -ForegroundColor DarkGray
$boot = Login "add@g.com" $pass
if ($boot.result.status -ne 200) { Write-Host "  cannot authenticate as add@g.com; aborting" -ForegroundColor Red; exit 1 }
$seedPerms = Call $boot.session "GET" "/permission/all"
$taskCreateId = ($seedPerms.body.data | Where-Object { $_.name -eq "task.create" }).id
$taskDeleteId = ($seedPerms.body.data | Where-Object { $_.name -eq "task.delete" }).id
$defaultMemberRole = (Call $boot.session "GET" "/role/all").body.data | Where-Object { $_.workspace_id -eq 2 -and $_.name -eq "user" } | Select-Object -First 1
$defaultMemberRoleId = $defaultMemberRole.id

# Remove any dynamic roles left behind (system roles are protected and skipped).
$allRoles = (Call $boot.session "GET" "/role/all").body.data
foreach ($r in $allRoles) {
  if ($r.workspace_id -eq 2 -and -not $r.is_system) { Call $boot.session "DELETE" "/role/delete" @{ id = $r.id } | Out-Null }
}
# Delete test users; deleting a user also drops their UserRole rows via the API.
$allUsers = (Call $boot.session "GET" "/user/all?limit=200").body.data.data
foreach ($u in $allUsers) {
  if ($u.email -like "*@test.com") { Call $boot.session "DELETE" "/user/delete/$($u.id)" | Out-Null }
}
# Remove any workspace-scoped custom permissions.
$seedNames = @("user.view","user.create","user.update","user.delete","role.view","role.create","role.update","role.delete","permission.view","permission.create","permission.update","permission.delete","task.view","task.create","task.update","task.delete","status.view","status.create","status.update","status.delete","dashboard.view.admin")
foreach ($p in $seedPerms.body.data) { if ($seedNames -notcontains $p.name) { Call $boot.session "DELETE" "/permission/delete" @{ id = $p.id } | Out-Null } }

# Provision the member this suite authenticates as, with a password this run
# controls. Depending on a pre-existing account's password is what made the
# suite unreplayable: the change-password workflow rotates it, so a run that
# aborted midway left the next run unable to log in and every member assertion
# cascaded to 401. The account is deleted again by the cleanup above, so this is
# always a fresh user on the default member role.
$memberEmail = "rbac_member@test.com"
$memberSeed = Call $boot.session "POST" "/user/create" @{ name = "RBAC Member"; email = $memberEmail; password = $pass }
if ($memberSeed.status -ne 201) { Write-Host "  cannot create $memberEmail; aborting" -ForegroundColor Red; exit 1 }
Write-Host "  seeded $memberEmail" -ForegroundColor DarkGray
Write-Host "  cleanup done" -ForegroundColor DarkGray

Write-Host "`n=== WORKFLOW C: LOGIN + PERMISSION RESOLUTION ===" -ForegroundColor Cyan
$admin = Login "add@g.com" $pass
Check "admin login returns 200" ($admin.result.status -eq 200) "got $($admin.result.status)"
$me = Call $admin.session "GET" "/auth/me"
Check "/auth/me returns 200" ($me.status -eq 200) "got $($me.status)"
$perms = $me.body.data.permissions
Check "admin has 21 permissions" ($perms.Count -eq 21) "got $($perms.Count)"
Check "admin has role.create" ($perms -contains "role.create")
Check "/auth/me exposes resolved role name" ($me.body.data.role.name -eq "admin") "got $($me.body.data.role.name)"

$member = Login $memberEmail $pass
$mme = Call $member.session "GET" "/auth/me"
$mperms = $mme.body.data.permissions
Check "member login returns 200" ($member.result.status -eq 200) "got $($member.result.status)"
Check "member has 6 permissions" ($mperms.Count -eq 6) "got $($mperms.Count)"
Check "member lacks user.update" (-not ($mperms -contains "user.update")) "$($mperms -join ',')"
Check "member lacks role.create" (-not ($mperms -contains "role.create"))
Check "member lacks dashboard.view.admin" (-not ($mperms -contains "dashboard.view.admin"))

$admin2 = Login "kingcoder003@gmail.com" $pass
Check "admin in workspace 5 logs in" ($admin2.result.status -eq 200) "got $($admin2.result.status)"
$me2 = Call $admin2.session "GET" "/auth/me"
$ws2RoleId = ($me.body.data.role).id
$ws5RoleId = ($me2.body.data.role).id
Write-Host ("  (ws2 admin role id = {0}, ws5 admin role id = {1})" -f $ws2RoleId, $ws5RoleId)

Write-Host "`n=== WORKFLOW E: ADMIN CREATES DYNAMIC ROLE ===" -ForegroundColor Cyan
$allPerms = Call $admin.session "GET" "/permission/all"
Check "permission catalogue returns 200" ($allPerms.status -eq 200) "got $($allPerms.status)"
Check "catalogue has 21 permissions" ($allPerms.body.data.Count -eq 21) "got $($allPerms.body.data.Count)"
$pidTaskCreate = ($allPerms.body.data | Where-Object { $_.name -eq "task.create" }).id
$pidTaskDelete = ($allPerms.body.data | Where-Object { $_.name -eq "task.delete" }).id
$pidUserDelete = ($allPerms.body.data | Where-Object { $_.name -eq "user.delete" }).id
$pidRoleCreate = ($allPerms.body.data | Where-Object { $_.name -eq "role.create" }).id

$cr = Call $admin.session "POST" "/role/create" @{ name = "Project Manager"; description = "Manages projects"; permission_ids = @($pidTaskCreate, $pidTaskDelete) }
Check "create role returns 200" ($cr.status -eq 200) "got $($cr.status) $($cr.raw)"
$pmRoleId = $cr.body.data.id
Check "created role id present" ($pmRoleId -gt 0)

$dupe = Call $admin.session "POST" "/role/create" @{ name = "Project Manager" }
Check "duplicate role name rejected 409" ($dupe.status -eq 409) "got $($dupe.status)"

Write-Host "`n=== WORKFLOW B: ADMIN CREATES USER WITHOUT ROLE (default) ===" -ForegroundColor Cyan
$c1 = Call $admin.session "POST" "/user/create" @{ name = "No Role User"; email = "norole@test.com"; password = "Member#Test123" }
Check "create user without role returns 201" ($c1.status -eq 201) "got $($c1.status) $($c1.raw)"
Check "default role assigned is 'user'" ($c1.body.data.role.name -eq "user") "got $($c1.body.data.role.name)"
Check "default user_type is 'user'" ($c1.body.data.user_type -eq "user") "got $($c1.body.data.user_type)"
Check "response does not leak password hash" (-not ($c1.raw -match '\$2[aby]\$')) $c1.raw
$nrLogin = Login "norole@test.com" "Member#Test123"
Check "no-role user can log in" ($nrLogin.result.status -eq 200) "got $($nrLogin.result.status)"
$nrMe = Call $nrLogin.session "GET" "/auth/me"
# 6 base permissions: user.view, task.view/create/update/delete, status.view.
# `user.update` is deliberately NOT a member permission -- it guards
# /user/assign-role and /user/toggle-active, which act on other users.
Check "no-role user has 6 base permissions" ($nrMe.body.data.permissions.Count -eq 6) "got $($nrMe.body.data.permissions.Count)"
Check "no-role user does NOT hold user.update" (-not ($nrMe.body.data.permissions -contains "user.update")) "$($nrMe.body.data.permissions -join ',')"

Write-Host "`n=== WORKFLOW A: ADMIN CREATES USER WITH DYNAMIC ROLE ===" -ForegroundColor Cyan
$c2 = Call $admin.session "POST" "/user/create" @{ name = "PM User"; email = "pm@test.com"; password = "Member#Test123"; role_id = $pmRoleId }
Check "create user with dynamic role returns 201" ($c2.status -eq 201) "got $($c2.status) $($c2.raw)"
Check "assigned role is Project Manager" ($c2.body.data.role.name -eq "Project Manager") "got $($c2.body.data.role.name)"
Check "dynamic role user_type stays 'user'" ($c2.body.data.user_type -eq "user") "got $($c2.body.data.user_type)"
$pmLogin = Login "pm@test.com" "Member#Test123"
Check "dynamic-role user can log in" ($pmLogin.result.status -eq 200) "got $($pmLogin.result.status)"
$pmMe = Call $pmLogin.session "GET" "/auth/me"
$pmPerms = $pmMe.body.data.permissions
Check "dynamic-role user has exactly 2 permissions" ($pmPerms.Count -eq 2) "got $($pmPerms.Count): $($pmPerms -join ',')"
Check "has task.create" ($pmPerms -contains "task.create")
Check "has task.delete" ($pmPerms -contains "task.delete")

Write-Host "`n=== WORKFLOW F: ADMIN REASSIGNS ROLE ===" -ForegroundColor Cyan
$pmUserId = $c2.body.data.id
$ar = Call $admin.session "PUT" "/user/assign-role" @{ id = $pmUserId; role_id = $pmRoleId }
Check "assign-role returns 200" ($ar.status -eq 200) "got $($ar.status) $($ar.raw)"
$ar2 = Call $admin.session "PUT" "/user/assign-role" @{ id = $nrLogin.result.body.data.id; role_id = $pmRoleId }
Check "assign role to no-role user returns 200" ($ar2.status -eq 200) "got $($ar2.status)"
$nrMe2 = Call (Login "norole@test.com" "Member#Test123").session "GET" "/auth/me"
Check "reassigned user now has 2 permissions" ($nrMe2.body.data.permissions.Count -eq 2) "got $($nrMe2.body.data.permissions.Count)"
# restore the default member role so later assertions stay meaningful
Call $admin.session "PUT" "/user/assign-role" @{ id = $nrLogin.result.body.data.id; role_id = $defaultMemberRoleId } | Out-Null

Write-Host "`n=== WORKFLOW D: CHANGE PASSWORD ===" -ForegroundColor Cyan
$cpBad = Call $member.session "PUT" "/auth/change-password" @{ currentPassword = "WrongPassword1!"; newPassword = "Changed#Test123"; confirmNewPassword = "Changed#Test123" }
Check "wrong current password rejected 400" ($cpBad.status -eq 400) "got $($cpBad.status)"
$cpSame = Call $member.session "PUT" "/auth/change-password" @{ currentPassword = $pass; newPassword = $pass; confirmNewPassword = $pass }
Check "same old/new password rejected 400" ($cpSame.status -eq 400) "got $($cpSame.status)"
$cpMismatch = Call $member.session "PUT" "/auth/change-password" @{ currentPassword = $pass; newPassword = "Changed#Test123"; confirmNewPassword = "Different#Test123" }
Check "confirm mismatch rejected 400" ($cpMismatch.status -eq 400) "got $($cpMismatch.status)"
$cpWeak = Call $member.session "PUT" "/auth/change-password" @{ currentPassword = $pass; newPassword = "weak"; confirmNewPassword = "weak" }
Check "weak new password rejected 400" ($cpWeak.status -eq 400) "got $($cpWeak.status)"
$cpNoAuth = Call (New-Object Microsoft.PowerShell.Commands.WebRequestSession) "PUT" "/auth/change-password" @{ currentPassword = $pass; newPassword = "Changed#Test123"; confirmNewPassword = "Changed#Test123" }
Check "unauthenticated change-password rejected 401" ($cpNoAuth.status -eq 401) "got $($cpNoAuth.status)"
$cp = Call $member.session "PUT" "/auth/change-password" @{ currentPassword = $pass; newPassword = "Changed#Test123"; confirmNewPassword = "Changed#Test123" }
Check "valid change-password returns 200" ($cp.status -eq 200) "got $($cp.status) $($cp.raw)"
Check "change-password does not leak hash" (-not ($cp.raw -match '\$2[aby]\$')) $cp.raw
$oldLogin = Login $memberEmail $pass
Check "old password no longer works" ($oldLogin.result.status -ne 200) "got $($oldLogin.result.status)"
$newLogin = Login $memberEmail "Changed#Test123"
Check "new password works" ($newLogin.result.status -eq 200) "got $($newLogin.result.status)"
# Continue in this workflow with the rotated credentials so every later member
# assertion is made against a real, working session.
$member = $newLogin

Write-Host "`n=== SYSTEM ROLE PROTECTION (workflow 46) ===" -ForegroundColor Cyan
$sysPatch = Call $admin.session "PUT" "/role/update" @{ id = $ws2RoleId; name = "hacked" }
Check "PATCH system role rejected 403" ($sysPatch.status -eq 403) "got $($sysPatch.status): $($sysPatch.body.message)"
$sysPermPatch = Call $admin.session "PUT" "/role/update" @{ id = $ws2RoleId; permission_ids = @($pidTaskCreate) }
Check "re-permission system role rejected 403" ($sysPermPatch.status -eq 403) "got $($sysPermPatch.status): $($sysPermPatch.body.message)"
$sysDel = Call $admin.session "DELETE" "/role/delete" @{ id = $ws2RoleId }
Check "DELETE system role rejected 403" ($sysDel.status -eq 403) "got $($sysDel.status): $($sysDel.body.message)"
$sysMemberRole = $defaultMemberRoleId
$sysMemberDel = Call $admin.session "DELETE" "/role/delete" @{ id = $sysMemberRole }
Check "DELETE system member role rejected 403" ($sysMemberDel.status -eq 403) "got $($sysMemberDel.status)"
$sysPermDel = Call $admin.session "DELETE" "/permission/delete" @{ id = $pidTaskCreate }
Check "DELETE system permission rejected 403" ($sysPermDel.status -eq 403) "got $($sysPermDel.status): $($sysPermDel.body.message)"
$sysPermUpd = Call $admin.session "PUT" "/permission/update" @{ id = $pidTaskCreate; name = "hacked.perm" }
Check "PATCH system permission rejected 403" ($sysPermUpd.status -eq 403) "got $($sysPermUpd.status)"

Write-Host "`n=== TENANT ISOLATION (workflow G) ===" -ForegroundColor Cyan
$xsPatch = Call $admin.session "PUT" "/role/update" @{ id = $ws5RoleId; name = "hacked" }
Check "ws2 admin cannot PATCH ws5 system role" ($xsPatch.status -eq 404) "got $($xsPatch.status): $($xsPatch.body.message)"
$xsDel = Call $admin.session "DELETE" "/role/delete" @{ id = $ws5RoleId }
Check "ws2 admin cannot DELETE ws5 system role" ($xsDel.status -eq 404) "got $($xsDel.status)"
$xsGet = Call $admin.session "GET" "/role/permissions?id=$ws5RoleId"
Check "ws2 admin cannot read ws5 role permissions" ($xsGet.status -eq 404) "got $($xsGet.status)"
$xsAssign = Call $admin.session "PUT" "/user/assign-role" @{ id = $pmUserId; role_id = $ws5RoleId }
Check "ws2 admin cannot assign ws5 role" ($xsAssign.status -eq 400) "got $($xsAssign.status): $($xsAssign.body.message)"
$xsCreate = Call $admin.session "POST" "/user/create" @{ name = "X"; email = "xs@test.com"; password = "Member#Test123"; role_id = $ws5RoleId }
Check "ws2 admin cannot create user with ws5 role" ($xsCreate.status -eq 400) "got $($xsCreate.status)"
$ws2Roles = Call $admin.session "GET" "/role/all"
$leaked = $ws2Roles.body.data | Where-Object { $_.workspace_id -ne 2 }
Check "role list contains no foreign-workspace roles" ($leaked.Count -eq 0) "leaked $($leaked.Count)"
$ws5Users = Call $admin2.session "GET" "/user/all"
$ws5UserIds = $ws5Users.body.data.data | ForEach-Object { $_.id }
$victim = $ws5UserIds | Select-Object -First 1
$xsToggle = Call $admin.session "PUT" "/user/toggle-active/$victim"
Check "ws2 admin cannot toggle ws5 user (IDOR blocked)" ($xsToggle.status -eq 404) "got $($xsToggle.status)"
$xsUserDelete = Call $admin.session "DELETE" "/user/delete/$victim"
Check "ws2 admin cannot delete ws5 user (IDOR blocked)" ($xsUserDelete.status -eq 404) "got $($xsUserDelete.status)"
$xsReadUser = Call $admin.session "GET" "/user/single?id=$victim"
Check "ws2 admin cannot read ws5 user profile" ($xsReadUser.status -eq 404) "got $($xsReadUser.status)"

Write-Host "`n=== AUTHORIZATION / PRIVILEGE ESCALATION ===" -ForegroundColor Cyan
# The change-password step above intentionally revoked this member's session,
# so re-authenticate with the rotated password before asserting authorization.
$member = Login $memberEmail "Changed#Test123"
$mRoleCreate = Call $member.session "POST" "/role/create" @{ name = "Sneaky" }
Check "member cannot create role (403)" ($mRoleCreate.status -eq 403) "got $($mRoleCreate.status)"
$mRoleList = Call $member.session "GET" "/role/all"
Check "member cannot list roles (403)" ($mRoleList.status -eq 403) "got $($mRoleList.status)"
$mUserCreate = Call $member.session "POST" "/user/create" @{ name = "Sneaky"; email = "sneak@test.com"; password = "Member#Test123" }
Check "member cannot create user (403)" ($mUserCreate.status -eq 403) "got $($mUserCreate.status)"
# The two routes that grant the administrative meaning of `user.update`. A
# member reaching either one can reassign an admin's role or lock the admin out,
# so both must be refused for a session holding only the default role.
$mRoleAssign = Call $member.session "PUT" "/user/assign-role" @{ id = 8; role_id = $ws2RoleId }
Check "member cannot assign roles (403)" ($mRoleAssign.status -eq 403) "got $($mRoleAssign.status)"
$mToggle = Call $member.session "PUT" "/user/toggle-active/8" @{ }
Check "member cannot deactivate other users (403)" ($mToggle.status -eq 403) "got $($mToggle.status)"
$mDash = Call $member.session "GET" "/admin/dashboard"
Check "member cannot view admin dashboard (403)" ($mDash.status -eq 403) "got $($mDash.status)"
$pmRoleCreate = Call $pmLogin.session "POST" "/role/create" @{ name = "Sneaky2" }
Check "dynamic-role user cannot create role (403)" ($pmRoleCreate.status -eq 403) "got $($pmRoleCreate.status)"
$pmUserDelete = Call $pmLogin.session "DELETE" "/user/delete/8"
Check "dynamic-role user cannot delete users (403)" ($pmUserDelete.status -eq 403) "got $($pmUserDelete.status)"
$selfDelete = Call $admin.session "DELETE" "/user/delete/7"
Check "admin cannot delete own account" ($selfDelete.status -eq 400) "got $($selfDelete.status)"
$crossPerm = Call $admin.session "POST" "/role/create" @{ name = "Bad Perms"; permission_ids = @(99999) }
Check "nonexistent permission id rejected 400" ($crossPerm.status -eq 400) "got $($crossPerm.status)"

Write-Host "`n=== ROLE DELETION REASSIGNS USERS (workflow 20) ===" -ForegroundColor Cyan
# Put both test users back on the role so the reassignment count is meaningful
# (Workflow F moved one of them back to the default member role).
Call $admin.session "PUT" "/user/assign-role" @{ id = $nrLogin.result.body.data.id; role_id = $pmRoleId } | Out-Null
$del = Call $admin.session "DELETE" "/role/delete" @{ id = $pmRoleId }
Check "delete dynamic role returns 200" ($del.status -eq 200) "got $($del.status) $($del.raw)"
Check "deletion reports both users reassigned" ($del.body.data.reassigned_users -eq 2) "got $($del.body.data.reassigned_users)"
$pmAfter = Call (Login "pm@test.com" "Member#Test123").session "GET" "/auth/me"
Check "reassigned user still logs in and has default role" ($pmAfter.body.data.role.name -eq "user") "got $($pmAfter.body.data.role.name)"
Check "reassigned user has 6 default permissions" ($pmAfter.body.data.permissions.Count -eq 6) "got $($pmAfter.body.data.permissions.Count)"
$nrAfter = Call (Login "norole@test.com" "Member#Test123").session "GET" "/auth/me"
Check "second reassigned user also lands on default role" ($nrAfter.body.data.role.name -eq "user") "got $($nrAfter.body.data.role.name)"
Check "second reassigned user has 6 default permissions" ($nrAfter.body.data.permissions.Count -eq 6) "got $($nrAfter.body.data.permissions.Count)"

Write-Host "`n=== VALIDATION ===" -ForegroundColor Cyan
$v1 = Call $admin.session "POST" "/user/create" @{ name = "X"; email = "not-an-email"; password = "Member#Test123" }
Check "invalid email rejected 400" ($v1.status -eq 400) "got $($v1.status)"
$v2 = Call $admin.session "POST" "/user/create" @{ name = "X"; email = "weak@test.com"; password = "weak" }
Check "weak password rejected 400" ($v2.status -eq 400) "got $($v2.status)"
$v3 = Call $admin.session "POST" "/user/create" @{ name = "X"; email = "norole@test.com"; password = "Member#Test123" }
Check "duplicate email rejected 409" ($v3.status -eq 409) "got $($v3.status)"
$v4 = Call $admin.session "POST" "/role/create" @{ name = "" }
Check "empty role name rejected 400" ($v4.status -eq 400) "got $($v4.status)"
$v5 = Call $admin.session "POST" "/permission/create" @{ name = "Invalid Name!" }
Check "malformed permission name rejected 400" ($v5.status -eq 400) "got $($v5.status)"
$v6 = Call $admin.session "GET" "/role/all"
Check "system roles marked is_system=true" (($v6.body.data | Where-Object { $_.name -eq "admin" }).is_system -eq $true)

Write-Host "`n=== CUSTOM PERMISSION (workspace scoped) ===" -ForegroundColor Cyan
$cp1 = Call $admin.session "POST" "/permission/create" @{ name = "reports.export"; description = "Export reports" }
Check "create custom permission returns 200" ($cp1.status -eq 200) "got $($cp1.status) $($cp1.raw)"
$customPermId = $cp1.body.data.id
$cp2 = Call $admin2.session "DELETE" "/permission/delete" @{ id = $customPermId }
Check "ws5 admin cannot delete ws2 custom permission" ($cp2.status -eq 404) "got $($cp2.status)"
$cp3 = Call $admin.session "PUT" "/permission/update" @{ id = $customPermId; description = "Updated desc" }
Check "update own custom permission returns 200" ($cp3.status -eq 200) "got $($cp3.status)"
$cp4 = Call $admin.session "DELETE" "/permission/delete" @{ id = $customPermId }
Check "delete own custom permission returns 200" ($cp4.status -eq 200) "got $($cp4.status)"

Write-Host "`n=== RESPONSE ENVELOPE ===" -ForegroundColor Cyan
$env = Call $admin.session "GET" "/role/all"
$envProps = if ($env.body) { ($env.body.PSObject.Properties.Name | Sort-Object) -join "," } else { "<null>" }
$hasEnvelope = ($env.body.statusCode -eq 200 -and $env.body.message -ne $null -and $null -ne $env.body.data -and $envProps -match "statusCode" -and $envProps -match "message" -and $envProps -match "data")
Check "response uses {statusCode, message, data}" $hasEnvelope "props=$envProps"

# ---------------------------------------------------------------------------
# Post-run cleanup. The pre-run block makes the suite replayable, but leaving
# four test accounts and a status column behind in a shared workspace is not
# acceptable either: they show up on the Team screen and in the status workflow
# of whoever runs this next. Remove everything this run created, through the
# public API, so a run leaves the workspace exactly as it found it.
# ---------------------------------------------------------------------------
Write-Host "`nPost-run cleanup" -ForegroundColor DarkGray
$cleanupAdmin = Login "add@g.com" $pass
if ($cleanupAdmin.result.status -eq 200) {
  $cs = $cleanupAdmin.session
  # dynamic roles first: deleting a role reassigns its users to the default
  # member role, which is what lets the user deletes below succeed cleanly.
  $csRoles = (Call $cs "GET" "/role/all").body.data
  foreach ($r in $csRoles) { if ($r.workspace_id -eq 2 -and -not $r.is_system) { Call $cs "DELETE" "/role/delete" @{ id = $r.id } | Out-Null } }
  # test accounts
  $csUsers = (Call $cs "GET" "/user/all?page=1&limit=200").body.data.data
  foreach ($u in $csUsers) { if ($u.email -like "*@test.com") { Call $cs "DELETE" "/user/delete/$($u.id)" | Out-Null } }
  # workspace-scoped custom permissions
  $csPerms = (Call $cs "GET" "/permission/all").body.data
  foreach ($p in $csPerms) { if ($seedNames -notcontains $p.name) { Call $cs "DELETE" "/permission/delete" @{ id = $p.id } | Out-Null } }
  # non-system statuses (the default workflow statuses are seeded, is_system = 1)
  $csStatuses = (Call $cs "GET" "/status/all").body.data
  foreach ($st in $csStatuses) { if (-not $st.is_system) { Call $cs "DELETE" "/status/delete" @{ id = $st.id } | Out-Null } }
  Write-Host "  cleanup done" -ForegroundColor DarkGray
} else {
  Write-Host "  could not authenticate for cleanup; test fixtures may remain" -ForegroundColor Yellow
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host ("PASSED: {0}   FAILED: {1}" -f $script:passCount, $script:failCount) -ForegroundColor $(if ($script:failCount -eq 0) { "Green" } else { "Red" })
Write-Host "=========================================`n" -ForegroundColor Cyan
