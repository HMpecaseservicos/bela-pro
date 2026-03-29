import * as QRCode from 'qrcode';

/**
 * Configurações de PIX para geração de código EMV
 */
export interface PixConfig {
  key: string;
  keyType: string;
  holderName: string;
  city: string;
}

/**
 * Remove acentos e caracteres especiais de uma string
 */
function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '');
}

/**
 * Calcula CRC16-CCITT para PIX (conforme especificação BACEN)
 */
function calculateCRC16(payload: string): string {
  const polynomial = 0x1021;
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera um ID de transação PIX único (até 25 caracteres alfanuméricos)
 */
export function generatePixTxId(): string {
  return `BELA${Date.now().toString(36).toUpperCase()}`.slice(0, 25);
}

/**
 * Gera código PIX EMV "copia e cola" conforme especificação BACEN
 */
export function generatePixCode(
  config: PixConfig,
  amountCents: number,
  txId: string,
  description?: string,
): string {
  const amount = (amountCents / 100).toFixed(2);

  const cleanName = removeAccents(config.holderName).toUpperCase().slice(0, 25);
  const cleanCity = removeAccents(config.city).toUpperCase().slice(0, 15);

  // ID 00 - Payload Format Indicator
  let payload = '000201';

  // ID 26 - Merchant Account Information (PIX)
  const gui = '0014BR.GOV.BCB.PIX';
  const chave = `01${config.key.length.toString().padStart(2, '0')}${config.key}`;
  const descField = description
    ? `02${removeAccents(description).slice(0, 25).length.toString().padStart(2, '0')}${removeAccents(description).slice(0, 25)}`
    : '';
  const merchantInfo = gui + chave + descField;
  payload += `26${merchantInfo.length.toString().padStart(2, '0')}${merchantInfo}`;

  // ID 52 - Merchant Category Code
  payload += '52040000';

  // ID 53 - Transaction Currency (986 = BRL)
  payload += '5303986';

  // ID 54 - Transaction Amount
  if (amountCents > 0) {
    payload += `54${amount.length.toString().padStart(2, '0')}${amount}`;
  }

  // ID 58 - Country Code
  payload += '5802BR';

  // ID 59 - Merchant Name
  payload += `59${cleanName.length.toString().padStart(2, '0')}${cleanName}`;

  // ID 60 - Merchant City
  payload += `60${cleanCity.length.toString().padStart(2, '0')}${cleanCity}`;

  // ID 62 - Additional Data Field Template
  const txIdField = `05${txId.length.toString().padStart(2, '0')}${txId}`;
  payload += `62${txIdField.length.toString().padStart(2, '0')}${txIdField}`;

  // ID 63 - CRC16 (calculado sobre todo o payload + "6304")
  payload += '6304';
  const crc = calculateCRC16(payload);
  payload = payload.slice(0, -4) + '6304' + crc;

  return payload;
}

/**
 * Gera QR Code em base64 (data URL) a partir de um código PIX
 */
export async function generatePixQrCode(pixCode: string): Promise<string> {
  return QRCode.toDataURL(pixCode, {
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}
