import { Resend } from 'resend';

// Función para obtener instancia de Resend (verifica la API key cada vez)
function getResendInstance(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new Resend(apiKey);
}

export class EmailService {
  /**
   * Envía un correo con las credenciales de un nuevo usuario
   */
  static async enviarCredenciales(
    correo: string,
    nombre: string,
    ci: string,
    password: string
  ): Promise<void> {
    try {
      // Verificar API key cada vez que se llama
      const apiKey = process.env.RESEND_API_KEY;
      console.log(`🔍 DEBUG: Verificando RESEND_API_KEY...`);
      console.log(`🔍 DEBUG: RESEND_API_KEY está ${apiKey ? `configurada (${apiKey.substring(0, 10)}...)` : 'NO configurada'}`);
      
      const resend = getResendInstance();
      
      // Si no hay API key configurada, solo loguear en desarrollo
      if (!resend) {
        console.log('═══════════════════════════════════════════════════');
        console.log('📧 CREDENCIALES DE USUARIO (NO ENVIADO POR CORREO)');
        console.log('═══════════════════════════════════════════════════');
        console.log(`Para: ${nombre} (${correo})`);
        console.log(`CI: ${ci}`);
        console.log(`Contraseña temporal: ${password}`);
        console.log('═══════════════════════════════════════════════════');
        console.log('\n⚠️  NOTA: Configure RESEND_API_KEY en .env para enviar correos reales\n');
        console.log(`🔍 DEBUG: RESEND_API_KEY está ${apiKey ? 'configurada' : 'NO configurada'}`);
        return;
      }

      // Configuración del remitente: usar onboarding@resend.dev por defecto
      const fromEmail = 'onboarding@resend.dev';
      const fromName = 'SGST Sistema';

      console.log(`📧 Intentando enviar correo a: ${correo}`);
      console.log(`📧 Desde: ${fromEmail}`);
      console.log(`📧 Nombre remitente: ${fromName}`);

      // Formato del remitente según documentación de Resend: "Nombre <email@domain.com>"
      const fromAddress = `${fromName} <${fromEmail}>`;

      console.log(`📧 Formato remitente: "${fromAddress}"`);

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [correo],
        subject: 'Bienvenido al Sistema SGST - Credenciales de Acceso',
        html: `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0; 
                padding: 0; 
                background-color: #f4f4f4;
              }
              .email-wrapper {
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff;
              }
              .header { 
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); 
                color: white; 
                padding: 40px 20px; 
                text-align: center; 
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
              }
              .content { 
                padding: 40px 30px; 
              }
              .greeting {
                font-size: 16px;
                margin-bottom: 20px;
              }
              .credentials-box { 
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
                border: 2px solid #2563eb;
                border-radius: 12px; 
                padding: 30px; 
                margin: 30px 0; 
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .credentials-title {
                font-size: 20px;
                font-weight: 600;
                color: #1e40af;
                margin-bottom: 20px;
                text-align: center;
              }
              .credential-item { 
                margin: 20px 0; 
                padding: 15px;
                background: white;
                border-radius: 8px;
                border-left: 4px solid #2563eb;
              }
              .credential-label { 
                font-weight: 600; 
                color: #64748b; 
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
              }
              .credential-value { 
                font-size: 24px; 
                color: #1e293b; 
                font-family: 'Courier New', monospace; 
                font-weight: 600;
                word-break: break-all;
              }
              .password-highlight {
                background: #fef3c7;
                padding: 2px 6px;
                border-radius: 4px;
                color: #92400e;
              }
              .warning-box { 
                background: #fff3cd; 
                border: 2px solid #ffc107; 
                border-radius: 8px; 
                padding: 20px; 
                margin: 30px 0; 
              }
              .warning-title {
                font-weight: 600;
                color: #856404;
                font-size: 16px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .warning-text {
                color: #856404;
                font-size: 14px;
                margin: 0;
                line-height: 1.6;
              }
              .instructions {
                background: #f8fafc;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
              }
              .instructions h3 {
                margin-top: 0;
                color: #1e40af;
                font-size: 18px;
              }
              .instructions ol {
                margin: 10px 0;
                padding-left: 20px;
              }
              .instructions li {
                margin: 8px 0;
                color: #475569;
              }
              .footer { 
                text-align: center; 
                padding: 30px 20px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                color: #64748b; 
                font-size: 12px; 
              }
              .footer p {
                margin: 5px 0;
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="header">
                <h1>🔐 Bienvenido al Sistema SGST</h1>
              </div>
              <div class="content">
                <div class="greeting">
                  <p>Estimado/a <strong>${nombre}</strong>,</p>
                  <p>Tu cuenta ha sido creada exitosamente en el <strong>Sistema de Gestión de Trámites (SGST)</strong>.</p>
                </div>
                
                <div class="credentials-box">
                  <div class="credentials-title">📋 Tus Credenciales de Acceso</div>
                  <div class="credential-item">
                    <div class="credential-label">Cédula de Identidad (Usuario)</div>
                    <div class="credential-value">${ci}</div>
                  </div>
                  <div class="credential-item">
                    <div class="credential-label">Contraseña de Un Solo Uso</div>
                    <div class="credential-value">
                      <span class="password-highlight">${password}</span>
                    </div>
                  </div>
                </div>

                <div class="warning-box">
                  <div class="warning-title">
                    ⚠️ IMPORTANTE: Contraseña Temporal
                  </div>
                  <p class="warning-text">
                    Esta es una <strong>contraseña de un solo uso</strong>. Por seguridad, 
                    <strong>deberás cambiar tu contraseña inmediatamente</strong> después de iniciar sesión por primera vez. 
                    No compartas esta contraseña con nadie.
                  </p>
                </div>

                <div class="instructions">
                  <h3>📝 Pasos para acceder al sistema:</h3>
                  <ol>
                    <li>Ingresa a la plataforma SGST</li>
                    <li>Utiliza tu <strong>Cédula de Identidad (${ci})</strong> como usuario</li>
                    <li>Ingresa la <strong>contraseña temporal</strong> proporcionada arriba</li>
                    <li>El sistema te solicitará <strong>cambiar tu contraseña</strong> inmediatamente</li>
                    <li>Crea una contraseña segura que cumpla con los requisitos:
                      <ul style="margin-top: 8px;">
                        <li>Mínimo 8 caracteres</li>
                        <li>Al menos una letra mayúscula</li>
                        <li>Al menos una letra minúscula</li>
                        <li>Al menos un número</li>
                        <li>Al menos un carácter especial (!@#$%&*)</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                  Si tienes alguna pregunta o necesitas asistencia, por favor contacta al administrador del sistema.
                </p>
              </div>
              <div class="footer">
                <p><strong>Sistema de Gestión de Trámites (SGST)</strong></p>
                <p>Este es un correo automático generado por el sistema.</p>
                <p style="margin-top: 10px; color: #94a3b8;">Por favor, no responda a este correo.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
═══════════════════════════════════════════════════════
  BIENVENIDO AL SISTEMA SGST
═══════════════════════════════════════════════════════

Estimado/a ${nombre},

Tu cuenta ha sido creada exitosamente en el Sistema de Gestión de Trámites (SGST).

═══════════════════════════════════════════════════════
  TUS CREDENCIALES DE ACCESO
═══════════════════════════════════════════════════════

Cédula de Identidad (Usuario): ${ci}
Contraseña de Un Solo Uso: ${password}

═══════════════════════════════════════════════════════
  ⚠️ IMPORTANTE: CONTRASEÑA TEMPORAL
═══════════════════════════════════════════════════════

Esta es una CONTRASEÑA DE UN SOLO USO. Por seguridad, 
DEBERÁS CAMBIAR TU CONTRASEÑA INMEDIATAMENTE después 
de iniciar sesión por primera vez.

No compartas esta contraseña con nadie.

═══════════════════════════════════════════════════════
  PASOS PARA ACCEDER AL SISTEMA
═══════════════════════════════════════════════════════

1. Ingresa a la plataforma SGST
2. Utiliza tu Cédula de Identidad (${ci}) como usuario
3. Ingresa la contraseña temporal proporcionada arriba
4. El sistema te solicitará cambiar tu contraseña inmediatamente
5. Crea una contraseña segura que cumpla con los requisitos:
   - Mínimo 8 caracteres
   - Al menos una letra mayúscula
   - Al menos una letra minúscula
   - Al menos un número
   - Al menos un carácter especial (!@#$%&*)

═══════════════════════════════════════════════════════

Si tienes alguna pregunta o necesitas asistencia, por favor 
contacta al administrador del sistema.

═══════════════════════════════════════════════════════
Sistema de Gestión de Trámites (SGST)
Este es un correo automático generado por el sistema.
Por favor, no responda a este correo.
═══════════════════════════════════════════════════════
        `,
      });

      if (error) {
        console.error('❌ Error al enviar correo con Resend:');
        console.error('   Tipo:', error?.name || 'Unknown');
        console.error('   Mensaje:', error?.message || JSON.stringify(error));
        console.error('   Detalles completos:', JSON.stringify(error, null, 2));
        // No lanzar error para no interrumpir la creación del usuario
        return;
      }

      if (data?.id) {
        console.log(`✅ Correo de credenciales enviado exitosamente a ${correo}`);
        console.log(`   📧 ID del correo: ${data.id}`);
        console.log(`   🔗 Revisa el estado en: https://resend.com/emails/${data.id}`);
      } else {
        console.warn(`⚠️  Correo enviado pero sin ID de confirmación. Revisa la consola de Resend.`);
      }
    } catch (error: any) {
      console.error('❌ Error inesperado al enviar correo:');
      console.error('   Tipo:', error?.name || 'Unknown');
      console.error('   Mensaje:', error?.message || JSON.stringify(error));
      console.error('   Stack:', error?.stack);
      // No lanzar error para no interrumpir la creación del usuario
      // Las credenciales se loguean en consola como respaldo
    }
  }
}
