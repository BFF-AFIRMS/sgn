
use strict;
use lib 't/lib';
use Test::More 'tests' => 11;
use SGN::Test::WWW::WebDriver;
use Selenium::Waiter qw/wait_until/;

# Import target modules for code coverage
use SGN::Controller::Authenticate::OIDC;

my $d = SGN::Test::WWW::WebDriver->new();

# Raise error if any command takes longer than 1 minute
$d->driver->set_implicit_wait_timeout(60000);

# -----------------------------------------------------------------------------
# Login by auto-provisioning a new account: newuser

# Load the login dialog box
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');

# Click the "Login with Keycloak" button
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak')->click() }, 'click login button');

# Enter Keycloak Username and Password and then click "Sign In" button
ok(wait_until { $d->driver->find_element_by_id('username')->send_keys("newuser") },  'enter username');
ok(wait_until { $d->driver->find_element_by_id('password')->send_keys("password") }, 'enter password');
ok(wait_until { $d->driver->find_element_by_id('kc-login')->click() }, 'click keycloak login button');

# Check that we have: 1. Logged in as 'newuser', and 2. Are on the homepage
ok(my $navbar_profile = wait_until { $d->driver->find_element_by_id('navbar_profile')->get_text() }, 'locate navbar profile');
ok ($navbar_profile eq 'newuser', 'logged in newuser');
ok(wait_until { $d->driver->get_page_source() } =~/What is Breedbase/, 'locate home page content');

# Logout
ok(wait_until { $d->driver->find_element_by_id('navbar_logout')->click() }, 'click logout button');
ok(wait_until { $d->driver->accept_alert }, 'confirm logout');

# Check that we logged out successfully by the presence of the 'Login' button again
ok( wait_until { $d->driver->find_element_by_id('site_login_button') }, 'locate login button' );

$d->driver->quit();
done_testing();
