import { API_BASE_URL } from './config';

const HEALTH_TIMEOUT_MS = 5000;

export type ServerHealthResult = {
  ok: boolean;
  status?: number;
  message?: string;
};

export async function checkServerHealth(): Promise<ServerHealthResult> {
  const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
  const timeoutId = setTimeout(() => controller?.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        Accept: 'application/json'
      },
      signal: controller?.signal
    });

    return {
      ok: response.ok,
      status: response.status,
      message: response.ok ? undefined : `서버 응답 상태 ${response.status}`
    };
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? '서버 응답 시간이 초과되었습니다.'
      : '서버에 연결할 수 없습니다.';

    return {
      ok: false,
      message
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
