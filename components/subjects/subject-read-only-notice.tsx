import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

export function SubjectReadOnlyNotice() {
  return (
    <Card as="section" className="border-slate-200 bg-slate-50">
      <Badge>Read only</Badge>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        This Stage 2 workspace displays subject, class and student setup data
        from Supabase. Creation, editing, imports and task setup are not part
        of this pass.
      </p>
    </Card>
  );
}
