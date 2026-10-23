import type { Metadata } from 'next';
import { LEGAL } from '../legal';

export const metadata: Metadata = { title: `Eliminación de datos · ${LEGAL.app}` };

export default function DataDeletionPage() {
  return (
    <>
      <h1>Eliminación de datos</h1>
      <p className="font-mono text-xs text-muted">Última actualización: {LEGAL.updated}</p>

      <h2>Si sos un negocio que usa {LEGAL.app}</h2>
      <ol>
        <li>
          Desconectá tu número desde la app WhatsApp Business: <strong>Configuración → Cuenta → Plataforma comercial →
          Desconectar cuenta</strong>. Desde ese momento dejamos de recibir mensajes nuevos.
        </li>
        <li>
          Escribinos a{' '}
          <a className="text-ink underline" href={`mailto:${LEGAL.email}?subject=Eliminación de datos`}>
            {LEGAL.email}
          </a>{' '}
          con el asunto <strong>&quot;Eliminación de datos&quot;</strong>, desde el email de tu cuenta, indicando el número
          de WhatsApp conectado.
        </li>
        <li>
          Eliminamos los contactos, mensajes, notas y el token de acceso de tu cuenta dentro de los 30 días y te
          confirmamos por email.
        </li>
      </ol>

      <h2>Si sos cliente de un negocio que usa {LEGAL.app}</h2>
      <p>
        Escribinos a{' '}
        <a className="text-ink underline" href={`mailto:${LEGAL.email}?subject=Eliminación de datos`}>
          {LEGAL.email}
        </a>{' '}
        indicando tu número de teléfono y el negocio con el que hablaste. Borramos tus mensajes y datos de contacto
        dentro de los 30 días. Los mensajes que sigan en el celular del negocio o en tu propio WhatsApp no dependen de
        nosotros.
      </p>

      <h2>Si usaste el inicio de sesión con Facebook</h2>
      <p>
        También podés quitar el acceso de la app desde Facebook: <strong>Configuración y privacidad → Configuración →
        Integraciones comerciales</strong>, elegir {LEGAL.app} y tocar <strong>Eliminar</strong>.
      </p>
    </>
  );
}
