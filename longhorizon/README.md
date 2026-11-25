# Předávání TD mezi Workem a LongHorizon

Uživatel zadává práci v češtině tam, kde běžně komunikuje. Work promění požadavek v krátké zadání s přesnou verzí hry, rozsahem a kritérii dokončení. LongHorizon vykoná úkol přes Codex CLI na samostatném běžícím stroji. Po dokončení Work převezme ověřený výsledek a shrne jej česky. Bobův zápis a GitHub slouží k předávání rozhodnutí mezi relacemi.

## Co si běhy předávají

- `WORK-HANDOFF.md` obsahuje stav projektu, ověřené změny a známé překážky. Nové zadání patří do `longhorizon/tasks/` a obsahuje konkrétní commit, rozsah a výsledek.
- `prepare.mjs` připraví jeden vstupní soubor. Zkontroluje, že výchozí commit v klonu existuje. Načte poslední staženou verzi `origin/work-handoff` a její commit zapíše do vstupu.
- Výsledek má obsahovat přesný commit a ověřitelné důkazy. Po kontrole se další relace opře o schválený výsledek v `WORK-HANDOFF.md`. Soukromé logy LongHorizon zůstávají na hostiteli.

## První případ

Pracovník potřebuje klon TD s touto větví a výchozím commitem, Node 20+, ověřený LongHorizon a přihlášený Codex CLI. Z koordinační větve vytvoř briefing:

```sh
git fetch origin
node longhorizon/prepare.mjs longhorizon/tasks/late-waves.md > late-waves-brief.md
```

Práci spusť s briefingem a samostatnou pracovní kopií přesného commitu. K běhu přiřaď vlastní adresář výsledků a zhruba hodinový limit na hostiteli. LongHorizon uchová průběh kola a poslední ověřený stav. Když běh zastaví limit, převezmi poslední uložený stav a označ chybějící ověření. Další navazující krok rozhodne Work na základě výsledků.

## Hostitel

Pro práci nezávislou na domácím PC použij samostatný Linux, který zůstává zapnutý. Codex CLI se přihlásí jednou, v prostředí bez prohlížeče lze použít oficiální přihlášení zařízením.

LongHorizon v0.1.8 předává Codexu v základní konfiguraci volbu pro vypnutí jeho sandboxu. Před prvním během ověř izolaci pracovníka a explicitní sandbox v adaptéru. Použij samostatnou kopii TD a odděl přístup k souborům, firemním datům a publikaci od účtu pracovníka. Úspěšná příprava briefu znamená stav *připraveno*; stav *běží* potvrzuje až zahájení skutečného běhu.

[LongHorizon v0.1.8](https://github.com/AMAP-ML/LongHorizon-Harness/releases/tag/v0.1.8) · [Adaptér Codex](https://github.com/AMAP-ML/LongHorizon-Harness/blob/v0.1.8/src/lh_harness/adapters/codex.py#L49-L64) · [Přihlášení Codex CLI](https://developers.openai.com/codex/auth)
