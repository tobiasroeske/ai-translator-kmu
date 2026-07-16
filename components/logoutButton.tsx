import { logout } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';

const LogoutButton = () => {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline" size="sm">
        Abmelden
      </Button>
    </form>
  );
};

export default LogoutButton;
