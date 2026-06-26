import { useState, useEffect, useCallback } from "react";
import axios, { type BaseResponse } from "@utils/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Key,
  AlertTriangle,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { isSubAccount } from "@utils/auth";

interface APIKeyInfo {
  id: number;
  name: string;
  key_preview: string;
  created_at: string;
  expires_at: string;
  last_used_at: string;
}

interface CreateAPIKeyResponse {
  id: number;
  name: string;
  key: string;
  created_at: string;
  expires_at: string;
}

export default function APIKeysPage() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<APIKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const subAccount = isSubAccount();
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get<BaseResponse<APIKeyInfo[]>>("/apikeys");
      if (response.data.data) {
        setKeys(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast.error(t('apiKeys.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error(t('apiKeys.nameRequired'));
      return;
    }
    try {
      setCreating(true);
      const body: { name: string; expires_at?: string } = {
        name: newKeyName.trim(),
      };
      if (newKeyExpiry) {
        body.expires_at = newKeyExpiry + " 23:59:59";
      }
      const response = await axios.post<BaseResponse<CreateAPIKeyResponse>>(
        "/apikeys",
        body,
      );
      if (response.data.data) {
        setCreatedKey(response.data.data.key);
        setNewKeyName("");
        setNewKeyExpiry("");
        toast.success(t('apiKeys.createSuccess'));
        fetchKeys();
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
      toast.error(t('apiKeys.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t('apiKeys.copiedToClipboard'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/apikeys/${id}`);
      toast.success(t('apiKeys.deleteSuccess'));
      setDeleteConfirm(null);
      fetchKeys();
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast.error(t('apiKeys.deleteFailed'));
    }
  };

  const handleCreateDialogClose = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setCreatedKey(null);
      setNewKeyName("");
      setNewKeyExpiry("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('apiKeys.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('apiKeys.description')}
            </p>
          </div>
          {!subAccount && (
            <Dialog open={createOpen} onOpenChange={handleCreateDialogClose}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('apiKeys.createKey')}
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {createdKey ? t('apiKeys.createdTitle') : t('apiKeys.createNewTitle')}
                </DialogTitle>
                <DialogDescription>
                  {createdKey
                    ? t('apiKeys.copyWarning')
                    : t('apiKeys.createdWarning')}
                </DialogDescription>
              </DialogHeader>

              {createdKey ? (
                <div className="space-y-4">
                  {/* Show created key */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-700 dark:text-amber-300">
                        {t('apiKeys.createdWarning')}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <code className="text-sm font-mono break-all text-gray-900 dark:text-gray-100">
                      {createdKey}
                    </code>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => handleCopy(createdKey)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? t('apiKeys.copied') : t('apiKeys.copyKey')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm mb-1.5 block">{t('apiKeys.name')}</Label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder={t('apiKeys.namePlaceholder')}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {t('apiKeys.nameHint')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">
                      {t('apiKeys.expiry')}
                    </Label>
                    <Input
                      type="date"
                      value={newKeyExpiry}
                      onChange={(e) => setNewKeyExpiry(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {t('apiKeys.expiryHint')}
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                {createdKey ? (
                  <Button
                    variant="outline"
                    onClick={() => handleCreateDialogClose(false)}
                  >
                    {t('apiKeys.close')}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleCreateDialogClose(false)}
                    >
                      {t('apiKeys.cancel')}
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={creating || !newKeyName.trim()}
                    >
                      {creating ? t('apiKeys.creating') : t('apiKeys.create')}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* API Key list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Key className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              {t('apiKeys.noKeys')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('apiKeys.createFirst')}
            </p>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('apiKeys.createFirstKey')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-gray-400 shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {apiKey.name}
                      </h3>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {apiKey.key_preview}
                      </code>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t('apiKeys.createdAt')}{" "}
                        {new Date(apiKey.created_at).toLocaleDateString("zh-CN")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {apiKey.last_used_at
                          ? `${t('apiKeys.lastUsedAt')} ${new Date(apiKey.last_used_at).toLocaleDateString()}`
                          : t('apiKeys.neverUsed')}
                      </span>
                      {apiKey.expires_at && (
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            new Date(apiKey.expires_at) < new Date()
                              ? "text-red-500"
                              : "text-gray-400",
                          )}
                        >
                          {new Date(apiKey.expires_at) < new Date()
                            ? t('apiKeys.expired')
                            : `${t('apiKeys.expiresAt')} ${new Date(apiKey.expires_at).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!subAccount && (
                      deleteConfirm === apiKey.id ? (
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-red-500">{t('apiKeys.confirmDelete')}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(apiKey.id)}
                          >
                            {t('apiKeys.delete')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            {t('apiKeys.deleteCancel')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-500"
                          onClick={() => setDeleteConfirm(apiKey.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Usage hint */}
        <div className="mt-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('apiKeys.usage')}
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
            <p>{t('apiKeys.usageDescription')}</p>
            <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto">
              <code>
                {`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://your-domain.com/api/stats/example.com/aggregate \\
  ?period=day&date=2024-01-01&metrics=visitors,pageviews`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}