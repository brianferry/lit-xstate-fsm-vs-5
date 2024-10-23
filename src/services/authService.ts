export type User = {
  id: string,
  name: string,
  role: 'admin' | 'editor' | 'user' | 'anonymous'
}

export async function authService(): Promise<User> {
  console.log('called')
  return new Promise((res) => {
    setTimeout(() => {
      res({
        id: '1',
        name: 'heymp',
        role: 'admin'
      })
    }, 5000);
  });
}
