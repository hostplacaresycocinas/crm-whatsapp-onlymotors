import 'server-only';
import { graph } from '@/lib/meta/graph';

export type Template = {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: { type: string; text?: string }[];
};

export async function listTemplates(wabaId: string, token: string) {
  const data = await graph<{ data: Template[] }>(
    `/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=50`,
    { token }
  );
  return data.data;
}

// Plantilla de solo texto. Meta la revisa: queda PENDING hasta que la aprueba o rechaza.
export async function createTemplate(
  wabaId: string,
  token: string,
  input: { name: string; category: 'UTILITY' | 'MARKETING'; language: string; body: string }
) {
  return graph<{ id: string; status: string }>(`/${wabaId}/message_templates`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      name: input.name,
      category: input.category,
      language: input.language,
      components: [{ type: 'BODY', text: input.body }],
    }),
  });
}
