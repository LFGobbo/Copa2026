// Gera a tabela do Anexo C para a Copa 2026
// 495 combinacoes de 8 grupos entre 12 (A-L)
// Cada slot de 3o colocado tem grupos elegiveis especificos
// Fonte: ESPN (abril 2026) + Wikipedia (FIFA Regulations Annex C)

const GROUP_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// Slots: game number -> { winnerGroup, eligibleGroups }
const SLOTS = {
  74: { winner: 'E', eligible: ['A','B','C','D','F'] },
  77: { winner: 'I', eligible: ['C','D','F','G','H'] },
  79: { winner: 'A', eligible: ['C','E','F','H','I'] },
  80: { winner: 'L', eligible: ['E','H','I','J','K'] },
  82: { winner: 'G', eligible: ['A','E','H','I','J'] },
  81: { winner: 'D', eligible: ['B','E','F','I','J'] },
  85: { winner: 'B', eligible: ['E','F','G','I','J'] },
  87: { winner: 'K', eligible: ['D','E','I','J','L'] }
};
const SLOT_ORDER = [74,77,79,80,82,81,85,87];

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// Gera todas as 495 combinacoes
const allCombos = combinations(GROUP_ORDER, 8);

// Para cada combinacao, determina UMA atribuicao valida (sem duplicata, completa).
// Algoritmo: backtracking (busca com retrocesso) sobre os 8 slots, na ordem de SLOT_ORDER.
// IMPORTANTE: isto garante que existe pelo menos 1 grupo distinto por slot, mas NAO garante
// que a escolha bate com a atribuicao real da FIFA em casos onde existe mais de uma atribuicao
// valida possivel -- a fonte de verdade para producao continua sendo third_place_matrix_2026.json
// (extraido e validado manualmente da FIFA/Wikipedia/ESPN, ver seu _meta). Este script e' so
// um gerador auxiliar, nunca usado pelo app em producao.
//
// Fix 2026-07-08 (v1, escolha gulosa pura): faltava remover do pool os grupos ja atribuidos a
// slots anteriores -- o mesmo grupo podia (e quase sempre acabava) sendo atribuido a mais de um
// slot na mesma combinacao (495/495 combinacoes com "duplicata interna").
// Fix 2026-07-08 (v2, backtracking): a v1 (greedy simples, sem retrocesso) corrigiu a duplicata
// mas ainda falhava em ~28/495 combinacoes -- a escolha gulosa alfabetica num slot podia esgotar
// a unica opcao elegivel de um slot posterior, sem chance de corrigir depois. Testado ao vivo:
// com backtracking completo, as 495 combinacoes passam a gerar atribuicao valida.
function assignSlots(qualifyingGroups) {
  const qSet = new Set(qualifyingGroups);
  const assigned = {};
  const used = new Set();

  function backtrack(slotIdx) {
    if (slotIdx >= SLOT_ORDER.length) return true; // todos os slots atribuidos com sucesso
    const gn = SLOT_ORDER[slotIdx];
    const slot = SLOTS[gn];
    const eligible = slot.eligible.filter(g => qSet.has(g) && !used.has(g)).sort();
    for (const candidate of eligible) {
      assigned[gn] = candidate;
      used.add(candidate);
      if (backtrack(slotIdx + 1)) return true; // achou solucao completa, propaga sucesso
      // Retrocede: desfaz esta escolha e tenta o proximo candidato
      used.delete(candidate);
      delete assigned[gn];
    }
    return false; // nenhum candidato deste slot leva a uma solucao completa
  }

  const ok = backtrack(0);
  if (!ok) return {}; // nao deveria acontecer para combinacoes validas de 8 grupos elegiveis
  return assigned;
}

// Gera a tabela compacta
// Chave: grupos qualificados ordenados (ex: "ABCDEFGH")
// Valor: array de 8 slots na ordem SLOT_ORDER com o grupo atribuido
const table = {};
for (const combo of allCombos) {
  const key = combo.sort().join('');
  const result = assignSlots(combo);
  // Compactar: para cada slot, salvar o indice do grupo em GROUP_ORDER
  const compact = SLOT_ORDER.map(gn => GROUP_ORDER.indexOf(result[gn]));
  table[key] = compact;
}

// Validar: 495 entradas, sem duplicatas, sem valores invalidos
const keys = Object.keys(table);
console.log('Total combinacoes:', keys.length);
console.log('Esperado: 495');
console.log('OK:', keys.length === 495);

// Verificar duplicatas
const unique = new Set(keys);
console.log('Unicas:', unique.size);
console.log('OK:', unique.size === 495);

// Verificar valores
let valid = true;
for (const key of keys) {
  const val = table[key];
  if (val.length !== 8) { valid = false; console.log('ERRO: tamanho', key); }
  for (const v of val) {
    if (v < 0 || v > 11) { valid = false; console.log('ERRO: valor', v, key); }
  }
  // Verificar sem duplicatas internas (cada grupo aparece uma vez)
  const uniqueVal = new Set(val);
  if (uniqueVal.size !== 8) { valid = false; console.log('ERRO: duplicata interna', key, val); }
}
console.log('Valores validos:', valid);

// Fix 2026-07-08: antes, o script seguia e escrevia annex_c_data.js mesmo com "Valores
// validos: false" -- sem guarda bloqueante, um erro no algoritmo (como o de duplicata
// interna corrigido acima) gerava um arquivo de saida inteiro invalido, silenciosamente.
if (!valid || keys.length !== 495 || unique.size !== 495) {
  console.error('Validacao falhou -- annex_c_data.js NAO foi gerado. Corrija o algoritmo antes de tentar de novo.');
  process.exit(1);
}

// Gerar saida JS compacta
// Formato: objeto com chave string (8 letras), valor string (8 indices hex)
let js = '// Anexo C - 495 combinacoes de 3os colocados\n';
js += '// Gerado em ' + new Date().toISOString().slice(0,10) + '\n';
js += '// Fonte: FIFA Regulations Annex C\n';
js += 'var THIRD_MAP={';
const entries = [];
for (const key of keys) {
  const val = table[key].map(v => v.toString(36)).join('');
  entries.push(key + ':\'' + val + '\'');
}
js += entries.join(',') + '};\n';

// Funcao de lookup
js += 'function _thirdSlotFor(qualifyingGroups,gameN){';
js += 'var key=qualifyingGroups.slice().sort().join(\'\');';
js += 'var row=THIRD_MAP[key];';
js += 'if(!row)return null;';
js += 'var idx=[74,77,79,80,82,81,85,87].indexOf(gameN);';
js += 'if(idx<0)return null;';
js += 'return GROUP_ORDER[parseInt(row[idx],36)];}';

require('fs').writeFileSync('annex_c_data.js', js);
console.log('\nanex_c_data.js gerado!');
console.log('Tamanho:', Buffer.byteLength(js, 'utf8'), 'bytes');
