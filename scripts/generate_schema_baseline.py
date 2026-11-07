#!/usr/bin/env python3
"""
Genera un snapshot legible del esquema real de Supabase (solo lectura).

Uso:
    set SUPABASE_ACCESS_TOKEN=sbp_xxx
    python scripts/generate_schema_baseline.py

Opcional:
    set SUPABASE_PROJECT_REF=mrktwxjlltqqxkvktkku
    set SCHEMA_BASELINE_OUT=docs/SCHEMA_BASELINE.md

Por qué existe:
    `supabase db pull` requiere Docker/pg_dump, que no está disponible en este
    entorno. Este script produce un baseline versionable del esquema a partir de
    los catálogos de PostgreSQL vía Management API. NO es DDL ejecutable: es una
    fotografía para revisión y diff. Para un baseline ejecutable usar
    `supabase db pull` en una máquina con Docker.
"""
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

REF = os.environ.get("SUPABASE_PROJECT_REF", "mrktwxjlltqqxkvktkku")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
OUT = os.environ.get("SCHEMA_BASELINE_OUT", "docs/SCHEMA_BASELINE.md")

if not TOKEN:
    sys.exit("Falta SUPABASE_ACCESS_TOKEN en el entorno.")

API = f"https://api.supabase.com/v1/projects/{REF}/database/query"


def query(sql):
    body = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        API,
        data=body,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode("utf-8"))


def esc(value):
    if value is None:
        return ""
    return str(value).replace("|", "\\|").replace("\n", " ")


def fmt_type(row):
    data_type = row["data_type"]
    if data_type == "ARRAY":
        return row["udt_name"].lstrip("_") + "[]"
    if data_type == "USER-DEFINED":
        return row["udt_name"]
    if data_type == "character varying" and row["character_maximum_length"]:
        return f"varchar({row['character_maximum_length']})"
    if data_type == "numeric" and row["numeric_precision"]:
        scale = row["numeric_scale"] or 0
        return f"numeric({row['numeric_precision']},{scale})"
    return data_type


def main():
    tables = query(
        """
        select c.relname as table_name, c.relrowsecurity as rls
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by 1;
        """
    )
    columns = query(
        """
        select table_name, ordinal_position, column_name, data_type, udt_name,
               is_nullable, column_default, character_maximum_length,
               numeric_precision, numeric_scale
        from information_schema.columns
        where table_schema = 'public'
        order by table_name, ordinal_position;
        """
    )
    constraints = query(
        """
        select conrelid::regclass::text as tbl, conname, contype,
               pg_get_constraintdef(oid) as definition
        from pg_constraint
        where connamespace = 'public'::regnamespace
        order by 1, 2;
        """
    )
    indexes = query(
        """
        select tablename, indexname, indexdef
        from pg_indexes
        where schemaname = 'public'
        order by tablename, indexname;
        """
    )
    policies = query(
        """
        select tablename, policyname, cmd, roles::text as roles, qual, with_check
        from pg_policies
        where schemaname = 'public'
        order by tablename, policyname;
        """
    )
    functions = query(
        """
        select p.proname,
               pg_get_function_identity_arguments(p.oid) as args,
               p.prosecdef as security_definer,
               p.proconfig as config,
               has_function_privilege('anon', p.oid, 'execute') as anon_exec,
               has_function_privilege('authenticated', p.oid, 'execute') as auth_exec
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
        order by p.proname;
        """
    )
    triggers = query(
        """
        select c.relname as tbl, t.tgname, pg_get_triggerdef(t.oid) as definition
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and not t.tgisinternal
        order by 1, 2;
        """
    )

    by_table = {}
    for col in columns:
        by_table.setdefault(col["table_name"], []).append(col)

    lines = []
    add = lines.append
    add("# BarberShifts — Baseline de esquema (snapshot)")
    add("")
    add(f"- Proyecto Supabase: `{REF}`")
    add(f"- Generado: {datetime.now(timezone.utc).isoformat(timespec='seconds')}")
    add("- Fuente: catálogos de PostgreSQL vía Management API (solo lectura)")
    add("- **No es DDL ejecutable.** Es una fotografía para revisión/diff.")
    add("- Baseline ejecutable: `supabase db pull` en una máquina con Docker.")
    add("")
    add("## Resumen")
    add("")
    add(f"- Tablas: {len(tables)}")
    add(f"- Columnas: {len(columns)}")
    add(f"- Restricciones: {len(constraints)}")
    add(f"- Índices: {len(indexes)}")
    add(f"- Políticas RLS: {len(policies)}")
    add(f"- Funciones: {len(functions)}")
    add(f"- Triggers: {len(triggers)}")
    add("")
    add("## Tablas y columnas")
    add("")
    for table in tables:
        name = table["table_name"]
        rls = "sí" if table["rls"] else "NO"
        add(f"### {name} (RLS: {rls})")
        add("")
        add("| # | Columna | Tipo | Null | Default |")
        add("|---|---------|------|------|---------|")
        for col in by_table.get(name, []):
            add(
                "| {pos} | {col} | {typ} | {null} | {default} |".format(
                    pos=col["ordinal_position"],
                    col=esc(col["column_name"]),
                    typ=esc(fmt_type(col)),
                    null="sí" if col["is_nullable"] == "YES" else "no",
                    default=("`" + esc(col["column_default"]) + "`")
                    if col["column_default"]
                    else "",
                )
            )
        add("")

    add("## Restricciones")
    add("")
    add("| Tabla | Nombre | Tipo | Definición |")
    add("|-------|--------|------|------------|")
    type_map = {"p": "PK", "u": "UNIQUE", "f": "FK", "c": "CHECK", "x": "EXCLUDE"}
    for con in constraints:
        add(
            "| {tbl} | {name} | {typ} | {definition} |".format(
                tbl=esc(con["tbl"]),
                name=esc(con["conname"]),
                typ=type_map.get(con["contype"], con["contype"]),
                definition=esc(con["definition"]),
            )
        )
    add("")

    add("## Índices")
    add("")
    add("| Tabla | Índice | Definición |")
    add("|-------|--------|------------|")
    for idx in indexes:
        add(
            f"| {esc(idx['tablename'])} | {esc(idx['indexname'])} | {esc(idx['indexdef'])} |"
        )
    add("")

    add("## Políticas RLS")
    add("")
    for pol in policies:
        add(f"### {pol['tablename']} · {pol['policyname']}")
        add("")
        add(f"- Comando: `{pol['cmd']}`")
        add(f"- Roles: `{pol['roles']}`")
        add(f"- USING: `{esc(pol['qual']) or '—'}`")
        add(f"- WITH CHECK: `{esc(pol['with_check']) or '—'}`")
        add("")

    add("## Funciones")
    add("")
    add("| Función | Argumentos | SECURITY DEFINER | search_path | anon | authenticated |")
    add("|---------|------------|------------------|-------------|------|----------------|")
    for fn in functions:
        config = fn["config"] or []
        search_path = next((c for c in config if str(c).startswith("search_path")), "—")
        add(
            "| {name} | {args} | {sd} | {sp} | {anon} | {auth} |".format(
                name=esc(fn["proname"]),
                args=esc(fn["args"]),
                sd="sí" if fn["security_definer"] else "no",
                sp=esc(search_path),
                anon="sí" if fn["anon_exec"] else "no",
                auth="sí" if fn["auth_exec"] else "no",
            )
        )
    add("")

    add("## Triggers")
    add("")
    add("| Tabla | Trigger | Definición |")
    add("|-------|---------|------------|")
    for trg in triggers:
        add(
            f"| {esc(trg['tbl'])} | {esc(trg['tgname'])} | {esc(trg['definition'])} |"
        )
    add("")

    os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as handle:
        handle.write("\n".join(lines))

    print(f"OK -> {OUT} ({len(lines)} líneas)")


if __name__ == "__main__":
    main()
