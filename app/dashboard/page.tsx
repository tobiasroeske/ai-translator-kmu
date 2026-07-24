import Translate from '@/app/dashboard/translate';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Übersetzen</h1>
        <p className="text-sm text-muted-foreground">
          Text einfügen, Zielsprache wählen — die Ausgangssprache wird automatisch erkannt.
        </p>
      </div>

      <Translate />
    </div>
  );
}
