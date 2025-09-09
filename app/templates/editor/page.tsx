'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Question = { id: string; text: string };

function SortableQuestion({ question }: { question: Question }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      {question.text}
    </div>
  );
}

export default function TemplateEditorPage() {
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: 'Pregunta 1' },
    { id: '2', text: 'Pregunta 2' },
    { id: '3', text: 'Pregunta 3' },
  ]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-xl font-semibold text-slate-800">Editor de plantilla</h1>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-6 space-y-3">
              {questions.map((q) => (
                <SortableQuestion key={q.id} question={q} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </main>
    </div>
  );
}
