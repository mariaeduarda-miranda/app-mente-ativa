# ⚠️ DESCONTINUADO

Esta pasta contém a implementação **antiga** do backend em Firebase Cloud Functions.

Ela **não é mais usada** pelo aplicativo. A API atual está em `backend/` (Express +
PostgreSQL) e é iniciada com `npm run dev`.

## Por que foi substituída

- O login antigo localizava o usuário com `admin.auth().getUserByEmail()` e **não
  verificava a senha**, permitindo obter um JWT apenas informando um e-mail existente.
- Se o e-mail não existisse, a conta era **criada automaticamente durante o login**.
- O emulador local não tinha o emulador de Auth configurado, então o login sempre
  falhava em desenvolvimento.

Mantenha esta pasta apenas como histórico. Se for fazer deploy, não exponha estas
funções: elas contêm a falha de segurança descrita acima.
