import { useMemo } from "react";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Calendar, FileText, Trash2, Edit2, ArrowDownAZ, ArrowUpZA, ArrowUpDown } from "lucide-react";
import type { TableViewProps } from "../types/Task.interface";

const priorityConfig: Record<string, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-orange-50 text-orange-600",
  low: "bg-green-50 text-green-700",
};

interface ExtendedTableViewProps extends TableViewProps {
  sortBy?: string;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
  onSort?: (field: string) => void;
}

const TableView = ({ tasks, loading, error, getStatusStyle, handleOpenModal, handleEditTask, handleDeleteTask, sortBy, sortOrder, onSort }: ExtendedTableViewProps) => {

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "task_name",
      header: "Task",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <FileText size={13} className="text-[#5A67D8]" />
          </div>
          <span
            className="text-sm font-semibold text-gray-800 cursor-pointer hover:text-[#5A67D8] transition-colors truncate max-w-[180px]"
            onClick={() => handleOpenModal("view", row.original)}
          >
            {row.original.task_name || "Unnamed Task"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status.name",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const { color } = getStatusStyle(status);
        return (
          <div className="flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs font-medium text-gray-600">{status}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => {
        const priority = String(getValue() || "").toLowerCase();
        const cls = priorityConfig[priority];
        return cls ? (
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cls}`}>
            {priority}
          </span>
        ) : (
          <span className="text-[10px] text-gray-300">—</span>
        );
      },
    },
    {
      accessorKey: "end_date",
      header: "Deadline",
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar size={12} />
            {format(new Date(date as any), "MMM d, yyyy")}
          </div>
        ) : <span className="text-gray-300 text-xs">—</span>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => handleEditTask(row.original)}
            className="p-1.5 rounded-md text-gray-400 hover:text-[#5A67D8] hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => handleDeleteTask(row.original.id)}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [getStatusStyle, handleOpenModal, handleEditTask, handleDeleteTask]);

  const table = useReactTable({ data: tasks || [], columns, getCoreRowModel: getCoreRowModel() });

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="text-gray-300 ml-1 inline" />;
    return sortOrder?.toUpperCase() === "ASC" ? 
      <ArrowUpZA size={12} className="text-[#5A67D8] ml-1 inline" /> : 
      <ArrowDownAZ size={12} className="text-[#5A67D8] ml-1 inline" />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto thin-scrollbar">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const isSortable = h.column.id === "task_name" || h.column.id === "end_date";
                  return (
                    <th key={h.id} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <div 
                        className={`flex items-center ${isSortable ? 'cursor-pointer select-none hover:text-gray-600' : ''}`}
                        onClick={() => {
                          if (isSortable && onSort) {
                            onSort(h.column.id);
                          }
                        }}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {isSortable && renderSortIcon(h.column.id)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && !tasks.length ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-gray-400 text-sm animate-pulse">
                  Loading tasks...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-gray-400 text-sm">
                  No tasks found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/60 transition-colors group">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {error && (
        <div className="px-4 py-2.5 bg-red-50 text-red-500 text-xs font-medium border-t border-red-100 flex-shrink-0">
          {error}
        </div>
      )}
    </div>
  );
};

export default TableView;