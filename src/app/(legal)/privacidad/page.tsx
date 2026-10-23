import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '../legal';

export const metadata: Metadata = { title: `Política de privacidad · ${LEGAL.app}` };

export default function PrivacyPage() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p className="font-mono text-xs text-muted">Última actualización: {LEGAL.updated}</p>

      <p>
        {LEGAL.app} es un CRM operado por {LEGAL.company} para que los negocios que lo usan gestionen las conversaciones
        de su número de WhatsApp Business. Esta política explica qué datos tratamos, para qué y cómo podés pedir que se
        borren.
      </p>

      <h2>Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>Usuarios del CRM:</strong> email y datos de sesión de las personas del negocio que inician sesión.
        </li>
        <li>
          <strong>Datos de WhatsApp que recibimos de Meta</strong> a través de la WhatsApp Business Platform, cuando el
          negocio conecta su número: nombre y número de teléfono de sus contactos, contenido y fecha de los mensajes
          enviados y recibidos, estado de entrega e identificadores de archivos multimedia.
        </li>
        <li>
          <strong>Historial y agenda:</strong> si el negocio lo autoriza al conectar el número, los chats individuales de
          los últimos 180 días y los contactos guardados en la app WhatsApp Business. No se importan grupos.
        </li>
        <li>
          <strong>Datos que carga el negocio:</strong> etapa de cada contacto, fechas de seguimiento y notas internas.
        </li>
        <li>
          <strong>Credenciales técnicas:</strong> el token de acceso que entrega Meta para operar el número. Se guarda
          solo en el servidor y nunca se muestra en el navegador.
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <p>
        Únicamente para prestar el servicio al negocio: mostrar sus conversaciones, permitirle responder dentro de la
        ventana de 24 horas que establece WhatsApp y organizar el seguimiento de sus clientes. No vendemos ni compartimos
        datos con terceros para publicidad, ni los usamos para entrenar modelos.
      </p>

      <h2>Con quién se comparten</h2>
      <p>Usamos proveedores que procesan datos por cuenta nuestra y solo para operar el servicio:</p>
      <ul>
        <li>Meta Platforms (WhatsApp Business Platform), para enviar y recibir mensajes.</li>
        <li>Supabase, como base de datos y autenticación (servidores en Estados Unidos).</li>
        <li>Vercel, como hosting de la aplicación.</li>
      </ul>

      <h2>Seguridad</h2>
      <p>
        Los datos viajan cifrados (HTTPS). Cada negocio solo puede ver la información de su propia cuenta, controlado a
        nivel de base de datos. Los webhooks de Meta se validan con firma antes de procesarse.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Mientras el negocio tenga su cuenta activa. Si desconecta el número o pide la baja, eliminamos sus datos dentro de
        los 30 días, salvo que una ley nos obligue a conservarlos.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir acceso, corrección o eliminación de tus datos escribiendo a{' '}
        <a className="text-ink underline" href={`mailto:${LEGAL.email}`}>
          {LEGAL.email}
        </a>
        . Si te escribió un negocio que usa {LEGAL.app}, también podés pedírselo directamente a ese negocio. En Argentina,
        la Agencia de Acceso a la Información Pública es la autoridad de control de la Ley 25.326 de Protección de Datos
        Personales.
      </p>
      <p>
        Para borrar tus datos, seguí las{' '}
        <Link className="text-ink underline" href="/eliminacion-datos">
          instrucciones de eliminación de datos
        </Link>
        .
      </p>

      <h2>Cambios</h2>
      <p>Si cambiamos esta política, actualizamos la fecha de arriba.</p>
    </>
  );
}
