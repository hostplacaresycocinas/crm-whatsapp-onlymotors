# App Review de WhatsApp (CRM Only Motors)

Objetivo: acceso avanzado a `whatsapp_business_messaging` y `whatsapp_business_management` para ser Tech Provider y poder usar el Embedded Signup con coexistencia.

Los textos para pegar en el formulario están en inglés: los revisores de Meta los leen así y se rechaza menos.

---

## 0. Antes de grabar

1. Número de prueba creado en **Casos de uso → WhatsApp → Paso 1. Pruébalo**. Anotar el identificador del número, el de la cuenta de WhatsApp Business y generar el token temporal.
2. En ese mismo paso, agregar tu celular como destinatario (te llega un código por WhatsApp).
3. En el CRM (Vercel): **WhatsApp → Cargar un número a mano** → pegar los tres datos → Guardar.
4. Desde tu celular, mandale un mensaje al número de prueba (ej: "Hola"). Eso abre la ventana de 24 h y el chat aparece en **Conversaciones**.
5. Grabar con **Win + Alt + R** (Xbox Game Bar). Se guarda en `Videos\Capturas` como MP4. Pantalla completa, sin otras pestañas con datos personales.

---

## 1. Video `whatsapp_business_messaging` (≈ 1 min)

Tiene que verse **el CRM enviando** y **WhatsApp recibiendo**. Lo más simple: WhatsApp Web en una mitad de la pantalla y el CRM en la otra (Win + flecha izquierda/derecha).

| # | Qué mostrar | Qué hacer |
|---|---|---|
| 1 | Login del CRM | Ingresar con el usuario de prueba |
| 2 | Conversaciones | Abrir el chat que empezaste desde tu celular. Se ve el mensaje entrante y "Ventana abierta" |
| 3 | Caja de respuesta | Escribir "Hola, gracias por escribir a Only Motors. ¿En qué auto estás interesado?" y enviar |
| 4 | WhatsApp Web | Mostrar que el mensaje llegó del número de prueba |
| 5 | (Opcional) | Contestar desde WhatsApp y mostrar que aparece en el CRM en tiempo real |

## 2. Video `whatsapp_business_management` (≈ 1 min)

| # | Qué mostrar | Qué hacer |
|---|---|---|
| 1 | CRM → WhatsApp | Mostrar el número de prueba en "Números" |
| 2 | Plantillas de mensaje | Completar: nombre `confirmacion_visita`, categoría Utilidad, texto "Hola, te escribimos de Only Motors para confirmar tu visita al showroom." |
| 3 | Crear plantilla | Tocar el botón y mostrar el mensaje "Plantilla creada (PENDING)" |
| 4 | Lista | Recargar y mostrar la plantilla en la lista con su estado |
| 5 | (Opcional) WhatsApp Manager | Mostrar la misma plantilla en business.facebook.com → WhatsApp Manager → Plantillas |

---

## 3. Uso permitido (pegar en cada permiso)

### whatsapp_business_messaging

> CRM Only Motors is a customer relationship management tool for car dealerships. The business connects its own WhatsApp Business number and uses the CRM to read incoming customer messages in real time and reply to them inside the 24-hour customer service window. Messages are sent only in response to a customer who wrote first; the business can also see the messages it sends from the WhatsApp Business app (coexistence), so the whole conversation history lives in one place. We do not send bulk or unsolicited messages.

### whatsapp_business_management

> We use whatsapp_business_management to onboard the business's WhatsApp Business account through Embedded Signup (WhatsApp Business app coexistence), subscribe our app to the account's webhooks, read the phone number details, synchronize contacts and chat history the business explicitly agreed to share, and create and list message templates so the business can follow up with customers after the 24-hour window. The business only manages its own WhatsApp assets.

---

## 4. Tratamiento de datos

| Pregunta | Respuesta |
|---|---|
| ¿Quién procesa los datos? | Agencia Grvity (responsable). Proveedores: Supabase (base de datos y autenticación, EE. UU.), Vercel (hosting, EE. UU.), Meta (WhatsApp). |
| ¿Se comparten con terceros? | No, salvo los proveedores anteriores para operar el servicio. No se venden ni se usan para publicidad. |
| ¿Dónde se guardan? | Supabase, región us-east-2 (EE. UU.). |
| Seguridad | HTTPS, aislamiento por negocio con Row Level Security, tokens solo en el servidor, firma de webhooks verificada. |
| Retención | Mientras la cuenta esté activa; borrado dentro de 30 días a pedido. |
| Política de privacidad | https://crm-whatsapp-onlymotors.vercel.app/privacidad |
| Eliminación de datos | https://crm-whatsapp-onlymotors.vercel.app/eliminacion-datos |
| ¿Pedidos de autoridades? | Se responden solo con orden legal válida y se notifica al negocio cuando la ley lo permite. |

---

## 5. Instrucciones para revisores

Crear antes un usuario de prueba en Supabase → Authentication → Add user (email y contraseña propios del revisor, con Auto Confirm) y pedir que lo agregue al tenant. **No usar tu usuario.**

> 1. Go to https://crm-whatsapp-onlymotors.vercel.app/login and sign in with: Email: `<EMAIL_DE_PRUEBA>` · Password: `<CONTRASEÑA_DE_PRUEBA>`
> 2. **Messaging:** open "Conversaciones" (chat icon). Send a WhatsApp message to the test number `<NÚMERO_DE_PRUEBA>` from any phone; it appears in the inbox in real time. Reply from the text box at the bottom: the reply is delivered to WhatsApp.
> 3. **Management:** open "WhatsApp" (phone icon). The connected number is listed under "Números". Under "Plantillas de mensaje", fill in a name (lowercase, e.g. `review_test`), a category and a body text, and press "Crear plantilla". The new template appears in the list with status PENDING.
> 4. The "Conectar mi WhatsApp Business" button launches Embedded Signup with WhatsApp Business app coexistence for our own business number.
