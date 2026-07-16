<script setup lang="ts">
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost tracking-wide">Ochrana osobních údajů</h1>
      <p class="text-sm text-gray-500 mt-1">Frosthaven Tracker — zásady zpracování údajů</p>
    </div>

    <div class="space-y-5 text-sm text-gray-300 leading-relaxed">
      <section class="fh-card p-5">
        <h2 class="font-display text-base font-semibold text-fh-primary-light mb-2">Jaké údaje ukládáme</h2>
        <ul class="list-disc pl-5 space-y-1 text-gray-400">
          <li><strong class="text-gray-300">Bez účtu:</strong> všechna data kampaně zůstávají pouze ve vašem prohlížeči (localStorage). Na server se nic neposílá.</li>
          <li><strong class="text-gray-300">S účtem:</strong> e-mailová adresa, uživatelské jméno, zahashované heslo (bcrypt) a data vašich kampaní pro synchronizaci mezi zařízeními.</li>
          <li><strong class="text-gray-300">Zpětná vazba:</strong> text zprávy, volitelně e-mail, stránka a technické informace prohlížeče.</li>
        </ul>
      </section>

      <section class="fh-card p-5">
        <h2 class="font-display text-base font-semibold text-fh-primary-light mb-2">K čemu je používáme</h2>
        <p class="text-gray-400">
          Výhradně k provozu aplikace: přihlášení, ověření e-mailu, obnova hesla
          a synchronizace kampaní. Údaje neprodáváme, nesdílíme s třetími stranami
          a neposíláme žádné marketingové e-maily.
        </p>
      </section>

      <section class="fh-card p-5">
        <h2 class="font-display text-base font-semibold text-fh-primary-light mb-2">Kde jsou data uložena</h2>
        <p class="text-gray-400">
          Na soukromém serveru provozovatele v EU. Přenos je šifrován (HTTPS).
          Hesla jsou ukládána pouze v podobě bezpečného hashe.
        </p>
      </section>

      <section class="fh-card p-5">
        <h2 class="font-display text-base font-semibold text-fh-primary-light mb-2">Vaše práva (GDPR)</h2>
        <ul class="list-disc pl-5 space-y-1 text-gray-400">
          <li><strong class="text-gray-300">Export:</strong> kompletní data kampaně si kdykoli stáhnete v Nastavení (JSON).</li>
          <li><strong class="text-gray-300">Smazání:</strong> účet včetně všech dat trvale smažete v Nastavení → Smazání účtu. Okamžitě a nevratně.</li>
          <li><strong class="text-gray-300">Přístup a oprava:</strong> e-mail i heslo můžete změnit v aplikaci; s čímkoli dalším se ozvěte přes tlačítko zpětné vazby.</li>
        </ul>
      </section>

      <section class="fh-card p-5">
        <h2 class="font-display text-base font-semibold text-fh-primary-light mb-2">Cookies a analytika</h2>
        <p class="text-gray-400">
          Aplikace nepoužívá sledovací cookies ani reklamní systémy. Pro přihlášení
          se používá pouze technický token uložený v prohlížeči.
        </p>
      </section>

      <p class="text-xs text-gray-600">
        Frosthaven Tracker je neoficiální fanouškovský nástroj. Frosthaven © Cephalofair Games.
      </p>
    </div>
  </div>
</template>
