import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Project } from "@/api/types";
import { ProjectList } from "./ProjectList";

function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Alpha",
    description: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const defaultProps = {
  isLoading: false,
  isError: false,
  error: null,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe("ProjectList", () => {
  it("renders edit and delete icon buttons for each project row", () => {
    const project = makeProject({ name: "Alpha" });
    render(<ProjectList {...defaultProps} projects={[project]} />);

    expect(screen.getByRole("button", { name: "Edit Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Alpha" })).toBeInTheDocument();
  });

  it("calls onEdit with the correct project when edit icon is clicked", async () => {
    const handleEdit = vi.fn();
    const project = makeProject({ name: "Bravo" });
    render(
      <ProjectList {...defaultProps} projects={[project]} onEdit={handleEdit} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Edit Bravo" }));

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(project);
  });

  it("calls onDelete with the correct project when delete icon is clicked", async () => {
    const handleDelete = vi.fn();
    const project = makeProject({ name: "Charlie" });
    render(
      <ProjectList {...defaultProps} projects={[project]} onDelete={handleDelete} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete Charlie" }));

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(project);
  });

  it("renders contextual accessible names per row when multiple projects are present", () => {
    const projects = [
      makeProject({ id: "00000000-0000-0000-0000-000000000001", name: "Alpha" }),
      makeProject({ id: "00000000-0000-0000-0000-000000000002", name: "Beta" }),
    ];
    render(<ProjectList {...defaultProps} projects={projects} />);

    expect(screen.getByRole("button", { name: "Edit Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Beta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Beta" })).toBeInTheDocument();
  });

  it("routes each edit/delete click to the correct row project — not a neighbour", async () => {
    const handleEdit = vi.fn();
    const projects = [
      makeProject({ id: "00000000-0000-0000-0000-000000000001", name: "Alpha" }),
      makeProject({ id: "00000000-0000-0000-0000-000000000002", name: "Beta" }),
    ];
    render(<ProjectList {...defaultProps} projects={projects} onEdit={handleEdit} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit Beta" }));

    expect(handleEdit).toHaveBeenCalledWith(projects[1]);
    expect(handleEdit).not.toHaveBeenCalledWith(projects[0]);
  });

  it("shows empty state when projects list is empty", () => {
    render(<ProjectList {...defaultProps} projects={[]} />);

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("shows error alert when isError is true", () => {
    render(
      <ProjectList
        {...defaultProps}
        isError
        error={new Error("Network error")}
        projects={undefined}
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Failed to load projects/)).toBeInTheDocument();
  });
});
