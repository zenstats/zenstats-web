import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Clipboard, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SiteInstallPage() {
  const navigate = useNavigate();
  const { domain = "" } = useParams<{ domain: string }>();
  const [copied, setCopied] = useState(false);

  const scriptSnippet = useMemo(
    () => {
      const scriptUrl = `${window.location.origin}/js/zenstats.js`;
      return `<script defer crossorigin="anonymous" data-domain="${domain}" src="${scriptUrl}"></script>`;
    },
    [domain],
  );

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(scriptSnippet);
      setCopied(true);
      toast.success("统计代码已复制");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败，请手动复制代码");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="border-0 shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">站点已创建</CardTitle>
          <CardDescription className="text-base">
            将下面的 ZenStats 统计代码添加到
            <span className="font-medium text-foreground"> {domain} </span>
            的每个页面中，建议放在 <code className="rounded bg-muted px-1">&lt;head&gt;</code> 内。
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">统计代码</h3>
              <Button variant="outline" size="sm" onClick={copySnippet}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
                {copied ? "已复制" : "复制代码"}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
              <code>{scriptSnippet}</code>
            </pre>
          </div>

          <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">下一步</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>把代码粘贴到网站模板或公共布局的 head 区域。</li>
              <li>部署你的网站。</li>
              <li>访问一次你的网站，然后回到 ZenStats 查看实时统计。</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate("/sites")}>返回站点列表</Button>
            <Button onClick={() => navigate(`/sites/${domain}/stats`)}>
              查看统计面板
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}