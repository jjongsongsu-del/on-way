export type HttpResponse<T> = {
  status: number;
  ok: boolean;
  body: T;
};

export async function requestJson<T>(url: string): Promise<HttpResponse<T>> {
  if (typeof globalThis.fetch === 'function') {
    const response = await globalThis.fetch(url);

    return {
      status: response.status,
      ok: response.ok,
      body: (await response.json()) as T
    };
  }

  return requestJsonWithXhr<T>(url);
}

function requestJsonWithXhr<T>(url: string): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest !== 'function') {
      reject(new Error('API request failed: no HTTP transport available'));
      return;
    }

    const xhr = new XMLHttpRequest();

    xhr.open('GET', url);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onload = () => {
      try {
        resolve({
          status: xhr.status,
          ok: xhr.status >= 200 && xhr.status < 300,
          body: JSON.parse(xhr.responseText) as T
        });
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new Error('API request failed: network error'));
    xhr.send();
  });
}
