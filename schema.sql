-- =====================================================================
-- Supabase Schema: Laboratorio Bot (recetas medicas manuscritas)
-- Tabla: recetas_medicas
-- =====================================================================

-- Crear extensión para UUIDs si no existe
create extension if not exists "uuid-ossp";

-- Tabla principal de recetas médicas
create table if not exists public.recetas_medicas (
  id uuid default uuid_generate_v4() primary key,
  telefono_paciente text not null,
  nombre_paciente text,
  edad integer,
  genero text,
  doctor text,
  centro_medico text,
  fecha_emision date,
  fecha_vencimiento date,
  medicamentos jsonb default '[]'::jsonb,
  instrucciones text,
  notas text,
  image_url text,
  status text default 'nueva' check (status in ('nueva', 'procesada', 'archivada', 'error')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índices para performance
create index if not exists idx_recetas_telefono on public.recetas_medicas (telefono_paciente);
create index if not exists idx_recetas_status on public.recetas_medicas (status);
create index if not exists idx_recetas_created on public.recetas_medicas (created_at desc);
create index if not exists idx_recetas_fecha_venc on public.recetas_medicas (fecha_vencimiento);

-- RLS (Row Level Security) - opcional, básico
alter table public.recetas_medicas enable row level security;

-- Políticas básicas: permitir lectura/escritura con service_role
create policy "allow_service_role_all" on public.recetas_medicas
  for all using (true) with check (true);

-- Trigger para updated_at
create or replace function public.trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_timestamp_recetas
  before update on public.recetas_medicas
  for each row execute function public.trigger_set_timestamp();

-- Comentario de la tabla
comment on table public.recetas_medicas is 'Recetas médicas procesadas desde WhatsApp (Kapso + OCR + IA)';
