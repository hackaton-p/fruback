import { BadRequestException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ApiErrorFilter } from './api-error.filter';
import { validationMessages } from './validation-messages';

describe('Actionable API errors', () => {
  function response(error: unknown) {
    const json = jest.fn<void, [unknown]>();
    const status = jest
      .fn<{ json: typeof json }, [number]>()
      .mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    new ApiErrorFilter().catch(error, host);
    return {
      status: status.mock.calls[0][0],
      body: json.mock.calls[0][0] as {
        message: string | string[];
        code?: string;
      },
    };
  }
  it('explains closing date failures without exposing SQL, row data or constraints', () => {
    const result = response({
      code: '23514',
      constraint: 'ck_jornada_5',
      query: 'SECRET SQL',
      detail: 'SECRET ROW',
    });
    expect(result.status).toBe(400);
    expect(result.body.message).toContain('anterior al inicio');
    expect(JSON.stringify(result)).not.toMatch(
      /SECRET|ck_jornada|Invalid data/,
    );
  });
  it('explains calculation overflow and hides unknown database metadata', () => {
    const result = response({
      code: '22003',
      column: 'private_internal_field',
      detail: 'SECRET',
    });
    expect(result.status).toBe(400);
    expect(result.body.message).toContain('rendimiento, eficiencia y personal');
    expect(JSON.stringify(result)).not.toMatch(/private_internal|SECRET/);
  });
  it('returns nested field validation in Spanish without input values', () => {
    const messages = validationMessages([
      {
        property: 'parameters',
        children: [
          {
            property: 'efficiencyFactor',
            constraints: { min: 'efficiencyFactor must not be less than 0.1' },
            value: 'SECRET',
          },
        ],
      },
    ]);
    expect(messages).toEqual([
      'Parámetros / Eficiencia: debe ser mayor o igual a 0.1.',
    ]);
    const result = response(
      new BadRequestException({ code: 'VALIDATION_ERROR', message: messages }),
    );
    expect(result.body).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: messages,
    });
  });
});
