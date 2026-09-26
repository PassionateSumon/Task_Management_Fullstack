import { useMemo, useState } from "react";
import { Search, ShieldCheck, X } from "lucide-react";
import type { Permission } from "../../permission/types/Permission.interface";
import {
  comparePermissionModules,
  comparePermissionNames,
  permissionModule,
  permissionModuleLabel,
} from "../../../common/utils/permissions";

/**
 * Permission picker for the role editor.
 *
 * Design notes, because the previous version got this wrong in two ways:
 *
 * 1. It labelled each row with a humanised verb taken from the name
 *    (`user.update` -> "Update"). Under a "USER" heading that tells an admin
 *    nothing about what they are about to grant. The backend already ships a
 *    real description for every permission, so that is the primary label and
 *    the dotted name is the secondary reference.
 *
 * 2. It put a one-click "Select all" on every module group. On a permissions
 *    list that is the wrong default: the fastest way to grant a role is then
 *    also the fastest way to hand it every administrative permission in the
 *    product. Granting is therefore strictly one row at a time. The only bulk
 *    action offered is "Clear", which moves permissions in the safe direction.
 *
 * The list is one scrollable region rather than nested per-group scrollers, so
 * there is a single scrollbar to track and the whole catalogue stays reachable.
 * Grouping is retained, but only as a sticky heading for scannability.
 */
const PermissionPicker = ({
  permissions,
  selected,
  onToggle,
  disabled,
}: {
  permissions: Permission[];
  /** Ids of the permissions currently granted to the role. */
  selected: number[];
  onToggle: (id: number) => void;
  /** Read-only, e.g. when editing an immutable system role. */
  disabled?: boolean;
}) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }, [permissions, query]);

  // Grouped once per filter change: modules in a deliberate order, and the
  // permissions inside each module in View -> Create -> Update -> Delete order.
  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    filtered.forEach((permission) => {
      const key = permissionModule(permission.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(permission);
    });
    return [...map.entries()]
      .sort(([a], [b]) => comparePermissionModules(a, b))
      .map(
        ([moduleName, groupPermissions]) =>
          [
            moduleName,
            [...groupPermissions].sort((a, b) =>
              comparePermissionNames(a.name, b.name)
            ),
          ] as const
      );
  }, [filtered]);

  const total = permissions.length;

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label
          htmlFor="permission-search"
          className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
        >
          Permissions
        </label>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-gray-400 tabular-nums">
            {selected.length} of {total} selected
          </span>
          {/* Bulk action is deliberately one-directional: revoke everything,
              never grant everything. */}
          {selected.length > 0 && !disabled && (
            <button
              type="button"
              onClick={() => selected.forEach((id) => onToggle(id))}
              className="text-[11px] font-semibold text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={14}
        />
        <input
          id="permission-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter permissions..."
          className="w-full pl-9 pr-3 py-2 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
        />
      </div>

      {/* The single scroll region for the whole catalogue.
          `flex-1 min-h-0` makes it absorb whatever height is left in the modal
          rather than guessing a viewport height, so there is exactly one
          scrollbar and the modal can never overflow the screen at any size.
          (`min-h-0` is required: a flex item defaults to `min-height: auto`,
          which would refuse to shrink and push the list past the modal.) */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar border border-gray-100 rounded-xl bg-white">
        {groups.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="inline-flex p-3 rounded-full bg-gray-50 mb-2">
              <ShieldCheck className="text-gray-300" size={22} />
            </div>
            <p className="text-gray-400 text-xs font-medium">
              No permission matches “{query.trim()}”
            </p>
          </div>
        ) : (
          groups.map(([moduleName, groupPermissions]) => {
            const chosen = groupPermissions.filter((p) =>
              selected.includes(p.id)
            ).length;
            return (
              <div key={moduleName}>
                {/* Sticky so the current module stays visible while scrolling
                    through a long catalogue. */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50/95 backdrop-blur border-y border-gray-100">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {permissionModuleLabel(`${moduleName}.x`)}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 tabular-nums">
                    {chosen}/{groupPermissions.length}
                  </span>
                </div>

                <ul>
                  {groupPermissions.map((permission) => {
                    const isChecked = selected.includes(permission.id);
                    return (
                      <li key={permission.id}>
                        <label
                          className={`flex items-start gap-3 px-3 py-2.5 border-b border-gray-50 transition-colors ${
                            disabled
                              ? "cursor-not-allowed opacity-60"
                              : isChecked
                                ? "bg-indigo-50/50 cursor-pointer"
                                : "hover:bg-gray-50 cursor-pointer"
                          }`}
                        >
                          {/* A real checkbox: native keyboard handling, focus
                              ring and screen-reader semantics for free. */}
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={disabled}
                            onChange={() => onToggle(permission.id)}
                            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-[#5A67D8] cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-gray-700 leading-snug">
                              {permission.description || permission.name}
                            </span>
                            <span className="block text-[10px] text-gray-400 font-mono truncate">
                              {permission.name}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>

      {query.trim() && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="self-start inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-[#5A67D8] transition-colors cursor-pointer"
        >
          <X size={11} />
          Clear filter
        </button>
      )}
    </div>
  );
};

export default PermissionPicker;
