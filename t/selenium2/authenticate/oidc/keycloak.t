
use strict;
use lib 't/lib';
use Test::More;
use SGN::Test::Fixture;
use SGN::Test::WWW::WebDriver;
use Selenium::Waiter qw/wait_until/;

# Set up the web driver
my $d = SGN::Test::WWW::WebDriver->new();

# Set up the DB connection
my $f = SGN::Test::Fixture->new();
my $dbh = $f->bcs_schema->storage->dbh;

# Set up our people
my $submitter = $d->user_data()->{submitter};
my $curator = $d->user_data()->{curator};

# -----------------------------------------------------------------------------
# Login by matching email to an existing account (SUCCESS)
# -----------------------------------------------------------------------------

# First, we must give our fixture user an email that match keycloak
my $q = "update sgn_people.sp_person set private_email = 'janedoe\@janedoe.test' where username = ?";
$dbh->prepare($q)->execute($curator->{username});

# Load the login dialog box
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');

# Click the "Login with Keycloak" button
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak')->click() }, 'click login button');

# Enter Keycloak Username and Password and then click "Sign In" button
ok(wait_until { $d->driver->find_element_by_id('username')->send_keys($curator->{username}) },  'enter username');
ok(wait_until { $d->driver->find_element_by_id('password')->send_keys($curator->{password}) }, 'enter password');
ok(wait_until { $d->driver->find_element_by_id('kc-login')->click() }, 'click keycloak login button');

# Check that we have: 1. Logged in as 'janedoe', and 2. Are on the homepage
ok(wait_until { $d->driver->find_element_by_id('navbar_profile')->get_text()} eq 'janedoe', 'logged in as janedoe');
ok(wait_until { $d->driver->get_page_source() } =~/What is Breedbase/, 'locate home page content');

# Logout Through Breedbase
ok(wait_until { $d->driver->find_element_by_id('navbar_logout')->click() }, 'click logout button');
ok(wait_until { $d->driver->accept_alert }, 'confirm logout');

# Check that we logged out successfully by the presence of the 'Login' button again
ok(wait_until { $d->driver->find_element_by_id('site_login_button') }, 'locate login button' );

# Check that single sign on has kept the user logged in
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak')->click() }, 'click login button');
ok(wait_until { $d->driver->find_element_by_id('navbar_profile')->get_text() } eq 'janedoe', 'logged in as janedoe');
ok(wait_until { $d->driver->get_page_source() } =~/What is Breedbase/, 'locate home page content');

# Logout Through Breedbase
ok(wait_until { $d->driver->find_element_by_id('navbar_logout')->click() }, 'click logout button');
ok(wait_until { $d->driver->accept_alert }, 'confirm logout');

# Logout through Keycloak
my $keycloak_logout = 'http://keycloak:9080/auth/realms/Breedbase/protocol/openid-connect/logout';
ok(wait_until { $d->driver->navigate($keycloak_logout); }, 'open keycloak logout');
ok(wait_until { $d->driver->find_element_by_id('kc-logout')->click() }, 'click keycloak logout button');
ok(wait_until { $d->driver->get_page_source() } =~/You are logged out/, 'locate logged out content');


# -----------------------------------------------------------------------------
# Attempt to login with an email that matches multiple users (ERROR)
# -----------------------------------------------------------------------------

# Give johndoe and janedoe the same email address
my $q = "update sgn_people.sp_person set pending_email = 'janedoe\@janedoe.test' where username = ?";
$dbh->prepare($q)->execute($submitter->{username});

# Load the login dialog box
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');

# Click the "Login with Keycloak" button
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak')->click() }, 'click login button');

# Enter Keycloak Username and Password and then click "Sign In" button
ok(wait_until { $d->driver->find_element_by_id('username')->send_keys($curator->{username}) },  'enter username');
ok(wait_until { $d->driver->find_element_by_id('password')->send_keys($curator->{password}) }, 'enter password');
ok(wait_until { $d->driver->find_element_by_id('kc-login')->click() }, 'click keycloak login button');

# Check that an error is raised
ok(wait_until { $d->driver->get_alert_text } =~/Multiple users were found to have the email/, 'raise error multiple users');
ok(wait_until { $d->driver->dismiss_alert }, 'dismiss error multiple users');


# -----------------------------------------------------------------------------
# Attempt to login with a new account when autoprovision is not enabled (ERROR)
# -----------------------------------------------------------------------------

# Load the login dialog box
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');

# Click the "Login with Keycloak" button
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak_no_auto_provision')->click() }, 'click login button');

# Enter Keycloak Username and Password and then click "Sign In" button
ok(wait_until { $d->driver->find_element_by_id('username')->send_keys("newuser") },  'enter username');
ok(wait_until { $d->driver->find_element_by_id('password')->send_keys("password") }, 'enter password');
ok(wait_until { $d->driver->find_element_by_id('kc-login')->click() }, 'click keycloak login button');

# Check that an error is raised
ok(wait_until { $d->driver->get_alert_text } =~/No system user was found/, 'raise error no system user found');
ok(wait_until { $d->driver->dismiss_alert }, 'dismiss error no system user found');


# -----------------------------------------------------------------------------
# Attempt to login with an email that is unverified in keycloak (ERROR)
# -----------------------------------------------------------------------------

# Load the login dialog box
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');

# Click the "Login with Keycloak" button
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak')->click() }, 'click login button');

# Enter Keycloak Username and Password and then click "Sign In" button
ok(wait_until { $d->driver->find_element_by_id('username')->send_keys('newuser_unverified') },  'enter username');
ok(wait_until { $d->driver->find_element_by_id('password')->send_keys('password') }, 'enter password');
ok(wait_until { $d->driver->find_element_by_id('kc-login')->click() }, 'click keycloak login button');

# Check that an error is raised
ok(wait_until { $d->driver->get_alert_text } =~/Your email is not verified/, 'raise error email not verified');
ok(wait_until { $d->driver->dismiss_alert }, 'dismiss error email not verified');


# -----------------------------------------------------------------------------
# Login by auto-provisioning a new account: 'newuser' (SUCCESS)
# -----------------------------------------------------------------------------

# Load the login dialog box
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');

# Click the "Login with Keycloak" button
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak')->click() }, 'click login button');

# Enter Keycloak Username and Password and then click "Sign In" button
ok(wait_until { $d->driver->find_element_by_id('username')->send_keys("newuser") },  'enter username');
ok(wait_until { $d->driver->find_element_by_id('password')->send_keys("password") }, 'enter password');
ok(wait_until { $d->driver->find_element_by_id('kc-login')->click() }, 'click keycloak login button');

# Check that we have: 1. Logged in as 'newuser', and 2. Are on the homepage
ok(wait_until { $d->driver->find_element_by_id('navbar_profile')->get_text() } eq 'newuser', 'logged in as newuser');
ok(wait_until { $d->driver->get_page_source() } =~/What is Breedbase/, 'locate home page content');

# Logout through Breedbase
ok(wait_until { $d->driver->find_element_by_id('navbar_logout')->click() }, 'click logout button');
ok(wait_until { $d->driver->accept_alert }, 'confirm logout');

# Logout through keycloak
my $keycloak_logout = 'http://keycloak:9080/auth/realms/Breedbase/protocol/openid-connect/logout';
ok(wait_until { $d->driver->navigate($keycloak_logout); }, 'open keycloak logout');
ok(wait_until { $d->driver->find_element_by_id('kc-logout')->click() }, 'click keycloak logout button');
ok(wait_until { $d->driver->get_page_source() } =~/You are logged out/, 'locate logged out content');

# -----------------------------------------------------------------------------
# Miscellaneous Error Handling (ERROR)
# -----------------------------------------------------------------------------

# Raise error if login has unknown provider
ok(wait_until { $d->driver->navigate('/authenticate/oidc/unknown/login'); }, 'login with unknown provider');
ok(wait_until { $d->driver->get_alert_text } =~/not configured/, 'raise error not configured');
ok(wait_until { $d->driver->dismiss_alert }, 'dismiss error not configured error');

# Raise error if callback has unknown provider
ok(wait_until { $d->driver->navigate('/authenticate/oidc/unknown/callback'); }, 'callback with unknown provider');
ok(wait_until { $d->driver->get_alert_text } =~/not configured/, 'raise error not configured');
ok(wait_until { $d->driver->dismiss_alert }, 'dismiss error not configured');

# Raise error if state_verifier cookie is missing
ok(wait_until { $d->driver->navigate('/authenticate/oidc/keycloak/callback'); }, 'callback with keycloak provider');
ok(wait_until { $d->driver->get_alert_text } =~/state verifier could not be found/, 'raise error state verifier not found');
ok(wait_until { $d->driver->dismiss_alert }, 'dismiss error state verifier not found');

# Raise error if observed state_verifier does not match expected
ok(wait_until { $d->driver->add_cookie('state_verifier', 'bad') }, 'create bad state_verifier cookie' );
ok(wait_until { $d->driver->navigate('/authenticate/oidc/keycloak/callback'); }, 'callback with keycloak provider');
ok(wait_until { $d->driver->get_alert_text } =~/does not match the initiating state/, 'raise error state verifier bad match');
ok(wait_until { $d->driver->dismiss_alert }, 'dismiss error state verifier bad match');

# Raise error if well known url is bad
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak-bad-well-known')->click() }, 'click login button');
ok(wait_until { $d->driver->get_alert_text } =~/Failed to fetch well known/, 'raise error well known fail');
ok(wait_until { $d->driver->dismiss_alert }, 'dismiss error well known fail');

# Keycloak error page if client id is bad
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak-bad-client-id')->click() }, 'click login button');
ok(wait_until { $d->driver->get_page_source() } =~/Client not found/, 'error page client not found');

# Raise error if client secret is bad
ok(wait_until { $d->driver->navigate('/user/login'); }, 'open login dialog');
ok(wait_until { $d->driver->find_element_by_id('login_with_keycloak-bad-client-secret')->click() }, 'click login button');
ok(wait_until { $d->driver->find_element_by_id('username')->send_keys($curator->{username}) },  'enter username');
ok(wait_until { $d->driver->find_element_by_id('password')->send_keys($curator->{password}) }, 'enter password');
ok(wait_until { $d->driver->find_element_by_id('kc-login')->click() }, 'click keycloak login button');
ok(wait_until { $d->driver->get_alert_text } =~/Invalid client credentials/, 'raise error invalid credentials');
ok(wait_until { $d->driver->dismiss_alert }, 'dismiss error invalid credentials');

# -----------------------------------------------------------------------------
# Revert database changes
# -----------------------------------------------------------------------------
my $q = "update sgn_people.sp_person set private_email = null where username = 'johndoe' or username = 'janedoe'";
$dbh->prepare($q)->execute();

my $q = "delete from sgn_people.sp_person where username = 'newuser'";
$dbh->prepare($q)->execute();

$d->driver->quit();
done_testing();
