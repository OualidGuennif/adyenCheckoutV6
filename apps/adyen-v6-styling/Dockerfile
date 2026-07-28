FROM denoland/deno:2.5.6

WORKDIR /app
ENV PORT=8000
ENV DATABASE_PATH=/app/data/styling.sqlite

COPY deno.json deno.lock ./
COPY packages ./packages
COPY scripts ./scripts
COPY apps ./apps

RUN deno task build:styling
RUN deno run -A scripts/assert-built-ssr.ts apps/adyen-v6-styling "V6 Styling"

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD deno eval "const p=Deno.env.get('PORT')??'8000';const r=await fetch('http://127.0.0.1:'+p+'/healthz');if(!r.ok)Deno.exit(1)"

CMD ["deno", "task", "--cwd", "apps/adyen-v6-styling", "start"]
