import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe('appointmentConfig.getConsultationFee', () => {
  afterEach(() => restoreEnv());

  test('falls back to APPOINTMENT_FEE for both types when no env override is set', async () => {
    delete process.env.CLINIC_CONSULTATION_FEE;
    delete process.env.VIRTUAL_CONSULTATION_FEE;

    const { getConsultationFee, APPOINTMENT_FEE } = await import(
      `../config/appointmentConfig.js?t=${Date.now()}-1`
    );

    assert.equal(getConsultationFee('offline'), APPOINTMENT_FEE);
    assert.equal(getConsultationFee('virtual'), APPOINTMENT_FEE);
  });

  test('reads independent fees from CLINIC_CONSULTATION_FEE and VIRTUAL_CONSULTATION_FEE', async () => {
    process.env.CLINIC_CONSULTATION_FEE = '600';
    process.env.VIRTUAL_CONSULTATION_FEE = '450';

    const { getConsultationFee } = await import(
      `../config/appointmentConfig.js?t=${Date.now()}-2`
    );

    assert.equal(getConsultationFee('offline'), 600);
    assert.equal(getConsultationFee('virtual'), 450);
  });

  test('treats any non-virtual value as a clinic consultation', async () => {
    process.env.CLINIC_CONSULTATION_FEE = '600';
    process.env.VIRTUAL_CONSULTATION_FEE = '450';

    const { getConsultationFee } = await import(
      `../config/appointmentConfig.js?t=${Date.now()}-3`
    );

    assert.equal(getConsultationFee(undefined), 600);
    assert.equal(getConsultationFee('offline'), 600);
  });
});
