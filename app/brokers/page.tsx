import Sidebar from '@/components/Sidebar';
import BrokerCompare from '@/components/BrokerCompare';
import { BROKERS } from '@/lib/brokers/data';

export default function BrokersPage({ searchParams }: { searchParams: { vs?: string } }) {
  const valid = BROKERS.map((b) => b.id);
  let ids = (searchParams.vs ? searchParams.vs.split(',') : ['pepperstone']).filter(
    (id) => id !== 'acy' && valid.includes(id)
  );
  if (ids.length === 0) ids = ['pepperstone'];
  ids = ids.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-xl font-semibold text-slate-800 mb-4">Comparador de Brokers</h1>
        <BrokerCompare initialVs={ids} />
      </main>
    </div>
  );
}
