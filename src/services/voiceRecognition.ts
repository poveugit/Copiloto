/**
 * Service for Voice Recognition (Web Speech API)
 * Allows motoboys to speak delivery earnings or expenses hands-free.
 * Example phrases:
 *  - "Ganho 25 reais no iFood 8 km"
 *  - "Corrida Uber 18 e 50 5 km"
 *  - "Gasto 40 reais de gasolina"
 *  - "Almoço 22 reais"
 *  - "Troca de óleo 45 reais"
 */

export interface ParsedVoiceEntry {
  mode: 'ganho' | 'gasto';
  amount: number;
  km: number;
  hours?: number;
  appOrCategoryName?: string;
  rawTranscript: string;
}

// Convert common Portuguese number words to digits if needed
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  meia: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
};

export function parseVoiceInput(text: string): ParsedVoiceEntry {
  const clean = text.toLowerCase().trim();

  // 1. Detect Mode (ganho vs gasto)
  const isGasto =
    clean.includes('gasto') ||
    clean.includes('despesa') ||
    clean.includes('gasolina') ||
    clean.includes('combustivel') ||
    clean.includes('combustível') ||
    clean.includes('almoço') ||
    clean.includes('almoco') ||
    clean.includes('lanche') ||
    clean.includes('manutenção') ||
    clean.includes('manutencao') ||
    clean.includes('óleo') ||
    clean.includes('oleo') ||
    clean.includes('pneu') ||
    clean.includes('relação') ||
    clean.includes('relacao') ||
    clean.includes('oficina') ||
    clean.includes('pastilha') ||
    clean.includes('mecânico') ||
    clean.includes('mecanico');

  const mode: 'ganho' | 'gasto' = isGasto ? 'gasto' : 'ganho';

  // 2. Extract Amount (R$)
  let amount = 0;
  // Regex matches: "25 reais", "25,50", "25.50", "25 e 50", "R$ 25", "30 conto"
  const amountWithCentsMatch = clean.match(/(\d+)[,\.](\d{1,2})/);
  const amountAndCentsMatch = clean.match(/(\d+)\s*(?:reais|real)?\s*e\s*(\d{1,2})/);
  const amountSimpleMatch = clean.match(/(\d+)\s*(?:reais|real|conto|pila)/);
  const anyNumberMatch = clean.match(/\b(\d+(?:[\.,]\d+)?)\b/);

  if (amountAndCentsMatch) {
    const intPart = parseInt(amountAndCentsMatch[1], 10);
    const centPart = parseInt(amountAndCentsMatch[2].padEnd(2, '0').slice(0, 2), 10);
    amount = intPart + centPart / 100;
  } else if (amountWithCentsMatch) {
    amount = parseFloat(`${amountWithCentsMatch[1]}.${amountWithCentsMatch[2]}`);
  } else if (amountSimpleMatch) {
    amount = parseFloat(amountSimpleMatch[1]);
  } else if (anyNumberMatch) {
    amount = parseFloat(anyNumberMatch[1].replace(',', '.'));
  }

  // 3. Extract KM (Quilômetros)
  let km = 0;
  const kmMatch = clean.match(/(\d+(?:[\.,]\d+)?)\s*(?:km|kms|quilometro|quilometros|quilômetro|quilômetros)/);
  if (kmMatch) {
    km = parseFloat(kmMatch[1].replace(',', '.'));
  }

  // 4. Extract App / Category Name
  let appOrCategoryName = '';
  if (mode === 'ganho') {
    if (clean.includes('ifood') || clean.includes('i food')) appOrCategoryName = 'iFood';
    else if (clean.includes('uber')) appOrCategoryName = 'Uber';
    else if (clean.includes('99') || clean.includes('noventa e nove')) appOrCategoryName = '99';
    else if (clean.includes('rappi')) appOrCategoryName = 'Rappi';
    else if (clean.includes('keeta')) appOrCategoryName = 'Keeta';
    else if (clean.includes('lalamove')) appOrCategoryName = 'Lalamove';
    else if (clean.includes('particular')) appOrCategoryName = 'Particular';
    else if (clean.includes('pizzaria') || clean.includes('restaurante')) appOrCategoryName = 'Restaurante';
  } else {
    if (clean.includes('gasolina') || clean.includes('combustivel') || clean.includes('posto')) appOrCategoryName = 'Combustível';
    else if (clean.includes('almoço') || clean.includes('almoco') || clean.includes('marmita')) appOrCategoryName = 'Alimentação';
    else if (clean.includes('lanche') || clean.includes('café') || clean.includes('cafe') || clean.includes('água')) appOrCategoryName = 'Alimentação';
    else if (clean.includes('óleo') || clean.includes('oleo')) appOrCategoryName = 'Troca de Óleo';
    else if (clean.includes('pneu') || clean.includes('câmara') || clean.includes('camara')) appOrCategoryName = 'Pneus';
    else if (clean.includes('relação') || clean.includes('relacao') || clean.includes('corrente')) appOrCategoryName = 'Relação/Corrente';
    else if (clean.includes('freio') || clean.includes('pastilha')) appOrCategoryName = 'Freios/Pastilhas';
    else if (clean.includes('oficina') || clean.includes('revisão') || clean.includes('revisao')) appOrCategoryName = 'Oficina';
    else appOrCategoryName = 'Outros';
  }

  return {
    mode,
    amount: isNaN(amount) ? 0 : amount,
    km: isNaN(km) ? 0 : km,
    appOrCategoryName,
    rawTranscript: text,
  };
}

export type MicPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/**
 * Checks the current microphone permission status on the device/browser without triggering a prompt.
 */
export async function checkMicrophonePermissionStatus(): Promise<MicPermissionState> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unsupported';
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return isSpeechRecognitionSupported() ? 'prompt' : 'unsupported';
  }

  if (navigator.permissions && typeof navigator.permissions.query === 'function') {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
        return status.state;
      }
    } catch {
      // Fallback for browsers that do not support querying 'microphone' via Permissions API
    }
  }

  const cached = localStorage.getItem('mochilinha_mic_permission_v1');
  if (cached === 'granted') return 'granted';
  return 'prompt';
}

/**
 * Explicitly triggers the native OS / browser microphone permission dialog on the user's device
 * using navigator.mediaDevices.getUserMedia({ audio: true }), then immediately releases the stream
 * so Web Speech API can use the microphone.
 */
export async function requestDeviceMicrophonePermission(): Promise<{
  granted: boolean;
  status: MicPermissionState;
  error?: string;
}> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      granted: false,
      status: 'unsupported',
      error: 'Ambiente sem suporte a captura de áudio.',
    };
  }

  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release audio tracks so SpeechRecognition can bind to the microphone
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      localStorage.setItem('mochilinha_mic_permission_v1', 'granted');
      return { granted: true, status: 'granted' };
    } catch (err: any) {
      const errName = err?.name || '';
      const errMsg = err?.message || '';
      localStorage.removeItem('mochilinha_mic_permission_v1');

      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('denied')
      ) {
        return {
          granted: false,
          status: 'denied',
          error:
            'Permissão de microfone negada no aparelho. Toque no ícone de cadeado/configurações na barra de endereço do navegador e permita o uso do Microfone.',
        };
      }

      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        return {
          granted: false,
          status: 'unsupported',
          error: 'Nenhum microfone foi encontrado neste dispositivo.',
        };
      }

      return {
        granted: false,
        status: 'denied',
        error: 'Não foi possível acessar o microfone do dispositivo. Verifique as permissões do aplicativo/navegador.',
      };
    }
  }

  // Fallback if mediaDevices is not exposed but SpeechRecognition exists
  if (isSpeechRecognitionSupported()) {
    return { granted: true, status: 'granted' };
  }

  return {
    granted: false,
    status: 'unsupported',
    error: 'Seu navegador não suporta comando de voz. Recomendamos usar o Google Chrome ou Microsoft Edge.',
  };
}

export function startSpeechRecognition(
  onResult: (parsed: ParsedVoiceEntry) => void,
  onError: (err: string) => void,
  onStart?: () => void,
  onEnd?: () => void
): { stop: () => void } {
  if (!isSpeechRecognitionSupported()) {
    onError('Reconhecimento de voz não suportado neste navegador. Use o Google Chrome, Safari ou Edge.');
    return { stop: () => {} };
  }

  let recognitionInstance: any = null;
  let isCancelled = false;

  // Request device microphone permission first, then start SpeechRecognition
  requestDeviceMicrophonePermission()
    .then(permResult => {
      if (isCancelled) return;

      if (!permResult.granted) {
        onError(
          permResult.error ||
            'Permissão de microfone necessária. Autorize o acesso ao microfone no seu dispositivo.'
        );
        if (onEnd) onEnd();
        return;
      }

      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechClass();
      recognitionInstance = recognition;

      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (onStart) onStart();
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          localStorage.removeItem('mochilinha_mic_permission_v1');
        }
        const errorMsg =
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'Permissão de microfone bloqueada no dispositivo. Ative o microfone nas permissões do navegador/celular.'
            : event.error === 'no-speech'
            ? 'Nenhuma fala detectada. Toque no microfone e fale próximo ao aparelho.'
            : event.error === 'audio-capture'
            ? 'Não foi possível capturar o áudio do microfone. Verifique se outro app está usando o microfone.'
            : `Aviso de voz: ${event.error}`;
        onError(errorMsg);
      };

      recognition.onend = () => {
        if (onEnd) onEnd();
      };

      recognition.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          const parsed = parseVoiceInput(transcript);
          onResult(parsed);
        }
      };

      try {
        recognition.start();
      } catch (err: any) {
        onError(err?.message || 'Falha ao iniciar o reconhecimento de voz.');
        if (onEnd) onEnd();
      }
    })
    .catch(() => {
      if (!isCancelled) {
        onError('Erro ao solicitar permissão de microfone no dispositivo.');
        if (onEnd) onEnd();
      }
    });

  return {
    stop: () => {
      isCancelled = true;
      try {
        if (recognitionInstance) {
          recognitionInstance.stop();
        }
      } catch {
        // ignore
      }
    },
  };
}

