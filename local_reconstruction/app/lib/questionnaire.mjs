// Ferramenta de cliente `dynamic_questionnaire` do agente do Pippit (esquema recuperado estaticamente do bundle async__159201, ver notes/dynamic_questionnaire.schema.json):
// {title?, questions:[{id,title,type: radio|checkbox|text|media, options[{id,label,value,selected?,description?}] (radio/checkbox), assets[{id,type,url,...}] (media), textValue?, placeholder? (text)}]}.
// Aqui os formulários LOCAIS do agente ganham a mesma forma (campo `questionnaire` na mensagem); o texto das perguntas é do PiperLine, NÃO do Pippit.
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'opcao';
const radio = (id, title, labels) => ({ id, title, type: 'radio', options: labels.map((l, i) => ({ id: `${id}_${i + 1}`, label: String(l), value: String(l), selected: i === 0 })) });
export function formToQuestionnaire(form) {
  if (!form || typeof form !== 'object') return null;
  if (form.type === 'question') return { title: 'Tema do vídeo', questions: [radio('theme', 'Escolha o tema principal', form.options || [])] };
  if (form.type === 'confirm_production') return { title: 'Confirmar produção', questions: [radio('mode', 'Como gerar os segmentos?', form.options?.mode || []), radio('auto_continue', 'Continuar automaticamente?', form.options?.autoContinue || [])] };
  if (form.type === 'credit_confirm') return { title: 'Confirmar créditos', questions: [radio('credit_confirm', `Custo estimado: ${form.estimatedCredits} créditos (limite ${form.limit}). Confirmar?`, ['Confirmar', 'Cancelar'])] };
  if (form.type === 'skill_inputs') return { title: 'Entradas da skill', questions: (form.missing || []).map((m) => ({ id: slug(m.id || m.label), title: String(m.label), type: 'text', placeholder: String(m.hint || '') })) };
  return null;
}
// validador do subconjunto de JSON Schema usado pelo esquema (type, enum, required, minLength, minItems, minimum, additionalProperties:false, properties, items)
export function validateAgainst(schema, v, at = '$') {
  const err = [];
  const t = schema.type;
  if (t === 'object') { if (typeof v !== 'object' || v === null || Array.isArray(v)) return [`${at}: esperado objeto`]; for (const k of schema.required || []) if (!(k in v)) err.push(`${at}.${k}: obrigatório`); for (const [k, x] of Object.entries(v)) { if (schema.properties?.[k]) err.push(...validateAgainst(schema.properties[k], x, `${at}.${k}`)); else if (schema.additionalProperties === false) err.push(`${at}.${k}: campo não permitido`); } }
  else if (t === 'array') { if (!Array.isArray(v)) return [`${at}: esperado array`]; if (schema.minItems && v.length < schema.minItems) err.push(`${at}: mínimo ${schema.minItems} item(ns)`); v.forEach((x, i) => err.push(...validateAgainst(schema.items, x, `${at}[${i}]`))); }
  else if (t === 'string') { if (typeof v !== 'string') return [`${at}: esperado string`]; if (schema.minLength && v.length < schema.minLength) err.push(`${at}: texto curto demais`); if (schema.enum && !schema.enum.includes(v)) err.push(`${at}: valor fora do enum`); }
  else if (t === 'boolean') { if (typeof v !== 'boolean') err.push(`${at}: esperado boolean`); }
  else if (t === 'integer') { if (!Number.isInteger(v) || (schema.minimum !== undefined && v < schema.minimum)) err.push(`${at}: inteiro inválido`); }
  return err;
}
