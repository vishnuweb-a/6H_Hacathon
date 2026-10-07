<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Keep every Kept content surface in its own TanStack file route with leaf metadata, so pages can be navigated and shared independently.
- Keep prototype data and recovery state in the browser-safe KeptProvider; no backend or real authentication is used because this is a local-mock prototype.
- Centralize semantic visuals in src/styles.css and Button variants so editorial styling stays consistent across pages.
- Keep public report fields separate from private ownership answers; public listing components must never render private details.
