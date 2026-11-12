export async function apiRequest<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'تعذّر إتمام العملية — يرجى المحاولة لاحقاً');
  }
  return data as T;
}

export async function listEntities<T = any>(collection: string): Promise<T[]> {
  const data = await apiRequest<{ items: T[] }>(`/api/entities/${collection}`);
  return data.items || [];
}

export async function getEntity<T = any>(collection: string, id: string): Promise<T> {
  const data = await apiRequest<{ item: T }>(`/api/entities/${collection}/${id}`);
  return data.item;
}

export async function createEntity<T = any>(collection: string, payload: Partial<T>): Promise<T> {
  const data = await apiRequest<{ item: T }>(`/api/entities/${collection}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.item;
}

export async function updateEntity<T = any>(collection: string, id: string, payload: Partial<T>): Promise<T> {
  const data = await apiRequest<{ item: T }>(`/api/entities/${collection}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.item;
}

export async function deleteEntity(collection: string, id: string): Promise<void> {
  await apiRequest(`/api/entities/${collection}/${id}`, { method: 'DELETE' });
}

export async function getConfig<T = any>(key: 'rag_settings' | 'widget_instances'): Promise<T> {
  const data = await apiRequest<{ value: T }>(`/api/config/${key}`);
  return data.value;
}

export async function saveConfig<T = any>(key: 'rag_settings' | 'widget_instances', value: T): Promise<T> {
  const data = await apiRequest<{ value: T }>(`/api/config/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
  return data.value;
}
