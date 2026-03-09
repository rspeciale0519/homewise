"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/admin/admin-toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { UserFormDialog } from "@/components/admin/user-form-dialog";

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  createdAt: string;
}

interface UserManagementTableProps {
  initialUsers: UserRow[];
  initialTotal: number;
}

const ROLES = ["all", "user", "agent", "admin"] as const;
const ROLE_COLORS: Record<string, string> = {
  user: "bg-slate-100 text-slate-600",
  agent: "bg-navy-50 text-navy-700",
  admin: "bg-crimson-50 text-crimson-700",
};

export function UserManagementTable({ initialUsers, initialTotal }: UserManagementTableProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const fetchUsers = useCallback(async (s: string, r: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), perPage: String(perPage) });
      if (s) params.set("search", s);
      if (r !== "all") params.set("role", r);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchUsers(value, roleFilter, 1);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
    fetchUsers(search, value, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchUsers(search, roleFilter, p);
  };

  const openAddForm = () => {
    setEditingUser(null);
    setFormMode("add");
    setFormOpen(true);
  };

  const openEditForm = (user: UserRow) => {
    setEditingUser(user);
    setFormMode("edit");
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
  }) => {
    if (formMode === "add") {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create user.");
      }
      toast("User created successfully.", "success");
      fetchUsers(search, roleFilter, page);
    } else if (editingUser) {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          role: data.role,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update user.");
      }
      const { user: updated } = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u)));
      toast("User updated.", "success");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("User deleted.", "success");
      setDeleteTarget(null);
      fetchUsers(search, roleFilter, page);
    } else {
      const err = await res.json();
      toast(err.error ?? "Failed to delete user.", "error");
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300"
        />
        <div className="flex gap-1">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => handleRoleFilter(r)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors",
                roleFilter === r
                  ? "bg-navy-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          onClick={openAddForm}
          className="px-4 py-2 bg-navy-600 text-white rounded-xl text-sm font-semibold hover:bg-navy-700 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add User
        </button>
      </div>

      <div className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-opacity",
        loading && "opacity-60"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-navy-700">
                    <Link href={`/admin/users/${user.id}`} className="hover:underline">
                      {user.firstName} {user.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", ROLE_COLORS[user.role] ?? ROLE_COLORS.user)}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs tabular-nums">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditForm(user)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors"
                        title="Edit user"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-crimson-700 hover:bg-crimson-50 transition-colors"
                        title="Delete user"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <UserFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        mode={formMode}
        initialData={
          editingUser
            ? {
                firstName: editingUser.firstName,
                lastName: editingUser.lastName,
                email: editingUser.email,
                phone: editingUser.phone ?? "",
                role: editingUser.role,
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}? This will remove their account, favorites, saved searches, and alerts. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
