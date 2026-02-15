"use client";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import {
  ChevronLeftCircle,
  ChevronRightCircle,
  ClipboardX,
  Download,
  Edit2,
  Eye,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SelectValue } from "@radix-ui/react-select";
import { Separator } from "@/components/ui/separator";
import { DialogClose } from "@radix-ui/react-dialog";
import { INote } from "@/lib/data-types";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";

export const AnthropicModels = [
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-6",
  "claude-haiku-4-5-20251001",
];

export const NoteEditor = ({
  note,
  API,
}: {
  note: INote;
  API: denizApi | null;
}) => {
  const { settings, setSettings } = useUserSettings();

  const [togglePreview, setTogglePreview] = useState(false);
  const [initialContent, setInitialContent] = useState(note.content || "");
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);

  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [printReady, setPrintReady] = useState(false);

  const [enhancing, setEnhancing] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [model, setModel] = useState<(typeof AnthropicModels)[number]>(
    "claude-sonnet-4-5-20250929",
  );
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const closeEnhanceDialogRef = useRef<HTMLButtonElement | null>(null);

  const handleSave = async () => {
    if (!API) return;
    try {
      setLoading(true);
      const result = await API.PUT<{ note: INote }>({
        endpoint: `notes/${note._id}`,
        body: { content },
      });
      if ("code" in result) {
        return;
      }
      setInitialContent(content);
    } catch (error) {
      console.error("Error saving note content:", error);
    } finally {
      setLoading(false);
      setTogglePreview(true);
    }
  };

  const handleExportPdf = () => {
    setPdfDialogOpen(false);
    setPrintReady(true);
  };

  useEffect(() => {
    if (!printReady) return;

    const timer = setTimeout(() => {
      window.print();
    }, 150);

    const handleAfterPrint = () => setPrintReady(false);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printReady]);

  const handleAIEnhance = async () => {
    if (!API) return;
    try {
      setEnhancing(true);
      const result = await API.POST<{ enhancedContent: string }>({
        endpoint: `notes/${note._id}/enhance`,
        body: {
          ...(additionalInfo ? { additionalInfo } : {}),
          model,
          content,
        },
      });

      if ("code" in result) {
        setEnhancing(false);
        return;
      }
      setContent(result.enhancedContent);
      setTogglePreview(true);
    } catch (error) {
      console.error("Error enhancing note:", error);
    } finally {
      setEnhancing(false);
      closeEnhanceDialogRef.current?.click();
    }
  };

  return (
    <div className="w-full relative">
      {toolbarOpen ? (
        <div className="flex flex-col gap-1 items-center absolute sm:right-2 right-0 sm:top-4 z-10 px-1 py-2 border shadow rounded-full bg-surface">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setTogglePreview((prev) => !prev)}
          >
            {togglePreview ? <Edit2 /> : <Eye />}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon-sm" className="">
                <Sparkles />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Enhance Note with AI</DialogTitle>

                <DialogDescription>
                  Use AI to enhance your note by making it more detailed, clear,
                  and well-structured.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-start gap-1">
                  <Label htmlFor="model" className="w-32">
                    Model
                  </Label>
                  <Select
                    value={model}
                    onValueChange={(value) =>
                      setModel(value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="z-99" position="popper">
                      {AnthropicModels.map((modelKey) => (
                        <SelectItem key={modelKey} value={modelKey}>
                          {modelKey}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex flex-col items-start gap-1">
                  <Label htmlFor="info" className="w-32">
                    Additional Info
                  </Label>
                  <Textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    id="info"
                    className="font-mono text-sm h-24 overflow-y-auto rounded-none resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose ref={closeEnhanceDialogRef} asChild>
                  <Button variant="outline" disabled={enhancing}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button onClick={handleAIEnhance} disabled={enhancing}>
                  {enhancing ? (
                    <>
                      Enhancing... <Loader2 className="animate-spin" />
                    </>
                  ) : (
                    "Enhance Note"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            disabled={content !== initialContent || loading}
            variant={"outline"}
            size={"icon"}
            onClick={async () => {
              const path = await save({
                filters: [
                  {
                    name: "Note Files",
                    extensions: ["md", "txt"],
                  },
                ],
                defaultPath: `${settings.defaultNoteDownloadPath}${note.title || "note"}.md`,
              });
              if (path) {
                const pathWithoutNoteName = path.substring(
                  0,
                  path.lastIndexOf("/") + 1,
                );
                if (pathWithoutNoteName.trim()) {
                  setSettings({ defaultNoteDownloadPath: pathWithoutNoteName });
                }
                try {
                  await writeTextFile(path, content);
                } catch (error) {
                  console.error("Error saving file:", error);
                }
              }
            }}
          >
            <Download />
          </Button>
          <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={content !== initialContent || loading}
                variant={"outline"}
                size={"icon"}
              >
                <FileText />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Export to PDF</DialogTitle>
                <DialogDescription>
                  Configure your PDF export options.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center space-x-2 py-4">
                <Checkbox
                  id="showHeader"
                  checked={showHeader}
                  onCheckedChange={(checked) => setShowHeader(checked === true)}
                />
                <Label htmlFor="showHeader" className="cursor-pointer">
                  Include header with logo, title, and date
                </Label>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPdfDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleExportPdf}>
                  Export PDF <FileText className="ml-2 h-4 w-4" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            onClick={handleSave}
            size="icon-sm"
            disabled={content === initialContent || loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
              </>
            ) : (
              <Save />
            )}
          </Button>
          <Button
            onClick={() => {
              setContent(initialContent);
            }}
            disabled={content === initialContent || loading}
            variant="secondary"
            size="icon-sm"
          >
            <ClipboardX />
          </Button>
          <Button
            variant={"outline"}
            size={"icon-sm"}
            className="rounded-full"
            onClick={() => setToolbarOpen(false)}
          >
            <ChevronRightCircle />
          </Button>
        </div>
      ) : (
        <Button
          variant={"outline"}
          size={"icon-sm"}
          className="absolute sm:top-4 sm:right-2 right-0 rounded-full"
          onClick={() => setToolbarOpen(true)}
        >
          <ChevronLeftCircle />
        </Button>
      )}

      {!togglePreview && (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          id="content"
          className="font-mono text-sm h-[calc(100vh-8rem)] overflow-y-auto rounded-none border-none! outline-none! ring-0! shadow-none!"
        />
      )}
      {togglePreview && (
        <div className="h-[calc(100vh-8rem)] overflow-y-auto w-full max-w-full! mx-auto bg-background px-3 py-2">
          <MarkdownRenderer content={content} />
        </div>
      )}

      {printReady &&
        createPortal(
          <div id="print-overlay">
            {showHeader && (
              <>
                <div className="flex justify-between items-center gap-2 font-calistoga px-6 pt-2">
                  <p className="text-xs">denizlg24</p>
                  <p className="text-xs font-mono">
                    {note.title || "note"}.md
                  </p>
                  <p className="text-xs">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
                <Separator className="my-1" />
              </>
            )}
            <div className="p-6">
              <MarkdownRenderer content={content} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
