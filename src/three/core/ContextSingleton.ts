/**
 * Базовый класс для реализации паттерна Singleton с поддержкой контекстов
 * Позволяет иметь несколько экземпляров одного класса для разных контекстов
 *
 * @example
 * class MyManager extends ContextSingleton<MyManager> {
 *   // ваш код
 * }
 *
 * // Использование:
 * MyManager.inst().doSomething();
 * MyManager.inst('worker').doSomething();
 */
export abstract class ContextSingleton<T extends ContextSingleton<T>> {
  private static _instancesMap = new Map<new () => any, Map<string, any>>();
  private static _defaultContexts = new Map<new () => any, string>();

  /**
   * Получить экземпляр для указанного контекста
   * @param context - контекст (по умолчанию 'main')
   * @returns экземпляр класса
   */
  public static inst<T extends ContextSingleton<T>>(this: new () => T, context?: string): T {
    const defaultContext = ContextSingleton._defaultContexts.get(this) || 'main';
    const ctx = context || defaultContext;

    if (!ContextSingleton._instancesMap.has(this)) {
      ContextSingleton._instancesMap.set(this, new Map<string, T>());
    }

    const instancesMap = ContextSingleton._instancesMap.get(this) as Map<string, T>;

    if (!instancesMap.has(ctx)) {
      instancesMap.set(ctx, new this());
    }

    return instancesMap.get(ctx)!;
  }

  /**
   * Установить экземпляр для контекста
   * @param context - контекст
   * @param instance - экземпляр класса
   */
  public static setInstance<T extends ContextSingleton<T>>(this: new () => T, context: string, instance: T): void {
    if (!ContextSingleton._instancesMap.has(this)) {
      ContextSingleton._instancesMap.set(this, new Map<string, T>());
    }

    const instancesMap = ContextSingleton._instancesMap.get(this) as Map<string, T>;
    instancesMap.set(context, instance);
  }

  /**
   * Проверить, существует ли экземпляр для контекста
   * @param context - контекст (по умолчанию 'main')
   * @returns true, если экземпляр существует
   */
  public static hasInstance<T extends ContextSingleton<T>>(this: new () => T, context?: string): boolean {
    const defaultContext = ContextSingleton._defaultContexts.get(this) || 'main';
    const ctx = context || defaultContext;

    if (!ContextSingleton._instancesMap.has(this)) {
      return false;
    }

    const instancesMap = ContextSingleton._instancesMap.get(this) as Map<string, T>;
    return instancesMap.has(ctx);
  }

  /**
   * Установить контекст по умолчанию для класса
   * @param context - контекст по умолчанию
   */
  public static setDefaultContext<T extends ContextSingleton<T>>(this: new () => T, context: string): void {
    ContextSingleton._defaultContexts.set(this, context);
  }
}
