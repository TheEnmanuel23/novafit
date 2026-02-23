import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="bg-muted/50 p-6 rounded-full mb-6 relative">
        <WifiOff className="w-16 h-16 text-muted-foreground" />
      </div>
      
      <h1 className="text-3xl font-bold tracking-tight mb-3">Estás Offline</h1>
      
      <p className="text-muted-foreground max-w-md mb-8">
        Parece que no tienes conexión a internet y esta página no pudo ser cargada desde la memoria caché.
      </p>
      
      <Link 
        href="/" 
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 rounded-md inline-flex items-center justify-center font-medium transition-colors"
      >
        Volver al Inicio
      </Link>
    </div>
  );
}
