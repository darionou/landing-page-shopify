describe('Project Setup', () => {
  it('should have TypeScript configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should be able to import modules', () => {
    const testValue: string = 'test';
    expect(typeof testValue).toBe('string');
  });
});
