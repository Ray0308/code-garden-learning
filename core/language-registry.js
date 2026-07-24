(function defineLanguageRegistry(root) {
  function createRegistry() {
    const courses = new Map();
    const engines = new Map();

    function requireId(definition, kind) {
      if (!definition || !/^[a-z][a-z0-9-]*$/.test(definition.id || '')) {
        throw new Error(`${kind} id must use lowercase letters, numbers, and hyphens`);
      }
    }

    function registerCourse(course) {
      requireId(course, 'Course');
      if (!course.meta?.label || !course.meta.fileName || !course.meta.editorLabel || !course.meta.intro || !course.meta.functionNote) {
        throw new Error(`Course metadata is incomplete: ${course.id}`);
      }
      if (!Array.isArray(course.curriculum) || !course.levels || typeof course.levels !== 'object') {
        throw new Error(`Course content is incomplete: ${course.id}`);
      }
      if (courses.has(course.id) && courses.get(course.id) !== course) {
        throw new Error(`Course is already registered: ${course.id}`);
      }
      courses.set(course.id, course);
      return course;
    }

    function registerEngine(engine) {
      requireId(engine, 'Engine');
      if (typeof engine.compile !== 'function' || typeof engine.formatError !== 'function') {
        throw new Error(`Language engine is incomplete: ${engine.id}`);
      }
      if (engines.has(engine.id) && engines.get(engine.id) !== engine) {
        throw new Error(`Language engine is already registered: ${engine.id}`);
      }
      engines.set(engine.id, engine);
      return engine;
    }

    function hasMode(id) {
      return courses.has(id) && engines.has(id);
    }

    function getMode(id) {
      if (!hasMode(id)) throw new Error(`Language mode is not ready: ${id}`);
      return { id, course: courses.get(id), engine: engines.get(id) };
    }

    function listModes() {
      return [...courses.keys()]
        .filter(hasMode)
        .map(id => {
          const course = courses.get(id);
          return { id, ...course.meta };
        });
    }

    return { registerCourse, registerEngine, hasMode, getMode, listModes };
  }

  const registry = createRegistry();
  registry.createRegistry = createRegistry;
  root.CODE_GARDEN_LANGUAGE_REGISTRY = registry;
  if (typeof module !== 'undefined' && module.exports) module.exports = registry;
})(typeof globalThis !== 'undefined' ? globalThis : window);
