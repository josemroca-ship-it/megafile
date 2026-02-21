export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <section className="bank-card p-8 text-center">
        <h1 className="font-display text-3xl text-navy">No encontrado</h1>
        <p className="mt-2 text-slate-600">La operación solicitada no existe o fue eliminada.</p>
      </section>
    </main>
  );
}
