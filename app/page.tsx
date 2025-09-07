'use client';
import Link from 'next/link';

export default function Landing() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="text-xl font-semibold text-slate-800">Corkboard CRM</div>
          <nav className="flex gap-3">
            <Link
              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50"
              href="/login"
            >
              Iniciar sesión
            </Link>
            <Link
              className="px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
              href="/signup"
            >
              Crear cuenta
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="mt-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
              Tu tablero de clientes, <br /> en tiempo real
            </h1>
            <p className="mt-3 text-slate-600">
              Crea plantillas flexibles, califica oportunidades y toma notas tipo sticky sin perder
              el contexto. Todo sincronizado con tu equipo.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                href="/signup"
              >
                Comenzar gratis
              </Link>
              <Link
                className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-50"
                href="/login"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          {/* Mockup/Preview */}
          <div className="rounded-2xl border bg-white shadow-sm p-6">
            <div className="h-56 rounded-xl bg-[radial-gradient(#c7a574_1px,transparent_1px),radial-gradient(#c7a574_1px,transparent_1px)] [background-size:16px_16px,16px_16px] [background-position:0_0,8px_8px]" />
            <p className="mt-4 text-sm text-slate-500">
              Vista de ejemplo estilo “corcho” para tu dashboard.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-semibold text-slate-800">Plantillas flexibles</h3>
            <p className="mt-2 text-sm text-slate-600">
              Crea y guarda tus propias plantillas de preguntas para cualificar clientes más rápido.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-semibold text-slate-800">Notas tipo sticky</h3>
            <p className="mt-2 text-sm text-slate-600">
              Añade notas rápidas en cada campo para no olvidar nada durante tus reuniones.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-semibold text-slate-800">Recomendaciones en vivo</h3>
            <p className="mt-2 text-sm text-slate-600">
              El sistema analiza respuestas y muestra qué servicio encaja mejor en tiempo real.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Corkboard CRM. Todos los derechos reservados.
        </footer>
      </div>
    </main>
  );
}
