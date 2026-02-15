"use client";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import { IFolder, INote } from "@/lib/data-types";
import { useEffect, useMemo, useState } from "react";
import { FileItem } from "./_components/file-item";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilePlus2, FolderPlus, MoveLeft } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbItem as BreadcrumbItemUI,
} from "@/components/ui/breadcrumb";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FileItem {
  type: "folder" | "note";
  _id: string;
  name: string;
  updatedAt: string;
}

interface BreadcrumbItem {
  folderId: string;
  folderName: string;
}

export default function NotesPage() {
  const { settings, loading: loadingSettings } = useUserSettings();

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directory, setDirectory] = useState<BreadcrumbItem[]>([]);

  const [note, setNote] = useState<INote | undefined>(undefined);

  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const [sort, setSort] = useState<
    "nameAsc" | "nameDesc" | "dateAsc" | "dateDesc"
  >("dateDesc");

  const fetchFiles = async (parentId?: string) => {
    if (!API) return;
    setLoading(true);
    const endpoint = parentId
      ? `files?folderId=${parentId}&search=${search}&sort=${sort}`
      : `files?search=${search}&sort=${sort}`;
    const result = await API.GET<{
      items: FileItem[];
      breadcrumbs: BreadcrumbItem[];
    }>({ endpoint });
    if ("code" in result) {
      setFiles([]);
    } else {
      setFiles(result.items);
      setDirectory(result.breadcrumbs);
    }
    setLoading(false);
    setNote(undefined);
  };

  useEffect(() => {
    if (!API || !loading) {
      return;
    }
    fetchFiles();
  }, [API]);

  useEffect(() => {
    if (!API || loading) {
      return;
    }
    fetchFiles();
  }, [sort]);

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-4 px-4 py-2">
        <div className="flex flex-row items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={directory.length === 0}
          >
            <MoveLeft />
          </Button>
          {searching ? (
            <Input
              placeholder=""
              className="w-full border-border"
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              value={search}
            />
          ) : (
            <Breadcrumb className="h-9 border border-border w-full px-3 py-1 rounded-md flex items-center">
              <BreadcrumbList className="text-sm">
                <BreadcrumbItemUI>
                  <BreadcrumbLink>home</BreadcrumbLink>
                </BreadcrumbItemUI>
                {directory.map((parent, index) => (
                  <React.Fragment key={parent.folderId}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItemUI>{parent.folderName}</BreadcrumbItemUI>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <Select
            value={sort ?? "dateAsc"}
            onValueChange={(value) => {
              setSort(value as typeof sort);
            }}
          >
            <SelectTrigger className="w-40 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nameAsc">Name A-Z</SelectItem>
              <SelectItem value="nameDesc">Name Z-A</SelectItem>
              <SelectItem value="dateDesc">Recent First</SelectItem>
              <SelectItem value="dateAsc">Oldest first</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <FolderPlus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={directory.length === 0}
          >
            <FilePlus2 />
          </Button>
        </div>
        <div className="w-full flex flex-col gap-0">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index}>
              <div className="w-full relative pl-3">
                <div className="flex flex-row items-center gap-1">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                  <div className="grow" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <Separator className="my-1 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 px-4 py-2">
      <div className="flex flex-row items-center gap-1">
        <Button
          onClick={() => {
            if (directory.length === 0) return;
            const newDirectory = [...directory];
            newDirectory.pop();
            setDirectory(newDirectory);
            fetchFiles(
              newDirectory.length > 0
                ? newDirectory[newDirectory.length - 1].folderId
                : undefined,
            );
          }}
          variant="outline"
          size="icon"
          disabled={directory.length === 0}
        >
          <MoveLeft />
        </Button>
        {searching ? (
          <Input
            autoFocus
            ref={searchInputRef}
            onBlur={() => {
              setSearching(false);
              setSearch("");
            }}
            placeholder=""
            className="w-full border-border"
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            value={search}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                fetchFiles(
                  directory.length > 0
                    ? directory[directory.length - 1].folderId
                    : undefined,
                );
              }
            }}
          />
        ) : (
          <Breadcrumb
            onClick={() => {
              setSearching(true);
              searchInputRef.current?.focus();
            }}
            className="h-9 border border-border w-full px-3 py-1 rounded-md flex items-center"
          >
            <BreadcrumbList className="text-sm">
              <BreadcrumbItemUI
                className="hover:cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setDirectory([]);
                  fetchFiles(undefined);
                }}
              >
                <BreadcrumbLink>home</BreadcrumbLink>
              </BreadcrumbItemUI>
              {directory.map((parent, index) => (
                <React.Fragment key={parent.folderId}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItemUI
                    className="hover:cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (index === directory.length - 1) return;
                      const newDirectory = directory.slice(0, index + 1);
                      setDirectory(newDirectory);
                      fetchFiles(
                        newDirectory.length > 0
                          ? newDirectory[newDirectory.length - 1].folderId
                          : undefined,
                      );
                    }}
                  >
                    <BreadcrumbLink>{parent.folderName}</BreadcrumbLink>
                  </BreadcrumbItemUI>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {!note && (
          <>
            <Select
              value={sort ?? "dateAsc"}
              onValueChange={(value) => {
                setSort(value as typeof sort);
              }}
            >
              <SelectTrigger className="w-40! border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" position="popper">
                <SelectItem value="nameAsc">Name A-Z</SelectItem>
                <SelectItem value="nameDesc">Name Z-A</SelectItem>
                <SelectItem value="dateDesc">Recent First</SelectItem>
                <SelectItem value="dateAsc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            <Dialog
              open={newFolderDialogOpen}
              onOpenChange={setNewFolderDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <FolderPlus />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Create new folder</DialogTitle>
                <DialogDescription>
                  Enter the name for the new folder.
                </DialogDescription>
                <Input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                  }}
                  placeholder="New folder"
                  className="w-full"
                />
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setNewName("");
                      setNewFolderDialogOpen(false);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!API) return;
                      const result = await API.POST<{ _id: string }>({
                        endpoint: "folders",
                        body: {
                          name: newName,
                          parentId:
                            directory.length > 0
                              ? directory[directory.length - 1].folderId
                              : "null",
                        },
                      });
                      if ("code" in result) {
                        return;
                      } else {
                        setFiles((prev) => [
                          ...prev,
                          {
                            _id: result._id,
                            name: newName,
                            type: "folder",
                            updatedAt: new Date().toISOString(),
                          },
                        ]);
                        setNewName("");
                        setNewFolderDialogOpen(false);
                      }
                    }}
                    variant="default"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={newFileDialogOpen}
              onOpenChange={setNewFileDialogOpen}
            >
              <DialogTrigger disabled={directory.length === 0} asChild>
                <Button variant="outline" size="icon">
                  <FilePlus2 />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Create new file</DialogTitle>
                <DialogDescription>
                  Enter the name for the new file.
                </DialogDescription>
                <Input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                  }}
                  placeholder="New file"
                  className="w-full"
                />
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setNewName("");
                      setNewFileDialogOpen(false);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!API) return;
                      const result = await API.POST<{ _id: string }>({
                        endpoint: "notes",
                        body: {
                          name: newName,
                          parentId:
                            directory.length > 0
                              ? directory[directory.length - 1].folderId
                              : "null",
                        },
                      });
                      if ("code" in result) {
                        return;
                      } else {
                        setFiles((prev) => [
                          ...prev,
                          {
                            _id: result._id,
                            name: newName,
                            type: "note",
                            updatedAt: new Date().toISOString(),
                          },
                        ]);
                        setNewName("");
                        setNewFileDialogOpen(false);
                      }
                    }}
                    variant="default"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      {!note ? (
        <div className="w-full flex flex-col gap-0">
          {files.map((file) => (
            <FileItem
              API={API}
              setFiles={setFiles}
              onClick={async () => {
                if (file.type === "folder") {
                  setDirectory((prev) => [
                    ...prev,
                    { folderId: file._id, folderName: file.name },
                  ]);
                  fetchFiles(file._id);
                }
                if (!API) return;
                const result = await API?.GET<INote>({
                  endpoint: `notes/${file._id}`,
                });
                if ("code" in result) {
                  return;
                } else {
                  setNote(result);
                  setDirectory((prev) => [
                    ...prev,
                    { folderId: "", folderName: file.name + ".md" },
                  ]);
                }
              }}
              key={file._id}
              type={file.type}
              _id={file._id}
              name={file.name}
              updatedAt={file.updatedAt}
            />
          ))}
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
}
