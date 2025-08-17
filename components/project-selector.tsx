"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Plus, ChevronDown } from "lucide-react"
import type { Project } from "@/lib/types"

interface ProjectSelectorProps {
  currentProject: Project | null
  projects: Project[]
  onProjectChange: (project: Project) => void
  onCreateProject: () => void
}

export default function ProjectSelector({
  currentProject,
  projects,
  onProjectChange,
  onCreateProject,
}: ProjectSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-accent hover:text-accent-foreground min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentProject?.color || "#10b981" }} />
            <span className="truncate">{currentProject?.name || "Default List"}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Projects</div>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => onProjectChange(project)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
            <div className="flex-1 min-w-0">
              <div className="truncate">{project.name}</div>
              {project.description && (
                <div className="text-xs text-muted-foreground truncate">{project.description}</div>
              )}
            </div>
            {project.is_default && (
              <Badge variant="secondary" className="text-xs">
                Default
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateProject} className="flex items-center gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          Create New Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
