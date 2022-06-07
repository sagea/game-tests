
type System = (t: number) => any;
export const App = () => {
  const systems = new Set<System>();
  const addSystem = (...manySystems: System[]) => {
    for (const system of manySystems) {
      systems.add(system);
    }
  }
  
  const run = () => {
    const animate = (t: number) => {
      for (const system of systems) {
        system(t);
      }
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  return {
    run,
    addSystem,
  }
}