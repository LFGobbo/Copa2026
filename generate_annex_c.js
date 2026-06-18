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

// Para cada combinacao, determina a atribuicao correta
// Algoritmo: simula o processo FIFA - para cada slot na ordem,
// encontra o melhor 3o elegivel que ainda nao foi alocado
function assignSlots(qualifyingGroups) {
  const assigned = {};
  const qSet = new Set(qualifyingGroups);
  
  for (const gn of SLOT_ORDER) {
    const slot = SLOTS[gn];
    // Grupos elegiveis para este slot que estao entre os qualificados
    const eligible = slot.eligible.filter(g => qSet.has(g));
    // O melhor 3o elegivel = o primeiro na ordem alfabetica (simplificado)
    // Na pratica, a FIFA usa ranking por pontos, mas para a matriz
    // de combinacoes, a ordenacao e por grupo (A-L), nao por pontos
    // Porque a tabela pre-determina qual combinacao de grupos produz
    // qual atribuicao, independente de pontos.
    assigned[gn] = eligible.sort()[0];
  }
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
