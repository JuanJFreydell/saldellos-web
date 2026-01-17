import type { Metadata } from "next";
import Header from "../components/Header";

export const metadata: Metadata = {
  title: "Política de Privacidad - Saldellos",
  description: "Política de privacidad de Saldellos",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-black dark:text-white mb-8">
          Política de Privacidad
        </h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              1. Información que Recopilamos
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Cuando utilizas Saldellos, recopilamos la siguiente información:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Información de cuenta: nombre, dirección de correo electrónico y contraseña</li>
              <li>Información de perfil: nombres, apellidos y otra información que elijas proporcionar</li>
              <li>Información de listados: títulos, descripciones, precios, ubicaciones y fotografías de los artículos que publicas</li>
              <li>Información de ubicación: coordenadas geográficas y direcciones asociadas a tus listados</li>
              <li>Información de mensajes: contenido de los mensajes que envías y recibes a través de la plataforma</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              2. Cómo Utilizamos tu Información
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Utilizamos la información recopilada para:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Proporcionar, mantener y mejorar nuestros servicios</li>
              <li>Facilitar la comunicación entre compradores y vendedores</li>
              <li>Personalizar tu experiencia en la plataforma</li>
              <li>Enviar notificaciones relacionadas con tu cuenta y actividad</li>
              <li>Cumplir con obligaciones legales y proteger nuestros derechos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              3. Compartir Información
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              No vendemos tu información personal. Podemos compartir tu información en las siguientes circunstancias:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Con otros usuarios de la plataforma cuando publicas un listado o envías un mensaje</li>
              <li>Con proveedores de servicios que nos ayudan a operar la plataforma (hosting, análisis, etc.)</li>
              <li>Cuando sea requerido por ley o para proteger nuestros derechos legales</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              4. Seguridad de los Datos
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal. Sin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              5. Tus Derechos
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Tienes derecho a:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Acceder a tu información personal</li>
              <li>Corregir información inexacta</li>
              <li>Solicitar la eliminación de tu información</li>
              <li>Oponerte al procesamiento de tu información</li>
              <li>Solicitar la portabilidad de tus datos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              6. Cookies y Tecnologías Similares
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Utilizamos cookies y tecnologías similares para mejorar tu experiencia, analizar el uso de la plataforma y personalizar el contenido. Puedes gestionar tus preferencias de cookies a través de la configuración de tu navegador.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              7. Cambios a esta Política
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos de cualquier cambio significativo publicando la nueva política en esta página y actualizando la fecha de "Última actualización".
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">
              8. Contacto
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Si tienes preguntas sobre esta política de privacidad, puedes contactarnos a través de tu perfil en la plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
