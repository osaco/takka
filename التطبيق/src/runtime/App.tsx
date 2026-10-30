import { useEffect } from 'react';
import { useRuntime } from './store';
import { SplashScreen } from './screens/Splash';
import { ProfileScreen } from './screens/Profile';
import { MapScreen } from './screens/Map';
import { IslandScreen } from './screens/Island';
import { SessionScreen } from './screens/Session';
import { EndScreen } from './screens/End';
import { ParentScreen } from './screens/Parent';

/** مخرج واحد للتطبيق: الشاشة تُختار من الحالة، لا من المسار. */
export function App() {
  const screen = useRuntime((s) => s.screen);
  const booted = useRuntime((s) => s.booted);
  const boot = useRuntime((s) => s.boot);

  useEffect(() => {
    if (!booted) void boot();
  }, [booted, boot]);

  return (
    <main lang="ar" dir="rtl" className="takka-app">
      {screen === 'splash' ? <SplashScreen /> : null}
      {screen === 'profile' ? <ProfileScreen /> : null}
      {screen === 'map' ? <MapScreen /> : null}
      {screen === 'island' ? <IslandScreen /> : null}
      {screen === 'session' ? <SessionScreen /> : null}
      {screen === 'end' ? <EndScreen /> : null}
      {screen === 'parent' ? <ParentScreen /> : null}
    </main>
  );
}

export default App;
