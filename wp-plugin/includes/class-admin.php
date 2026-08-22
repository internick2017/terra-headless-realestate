<?php
/**
 * Tools -> Terra demo content.
 *
 * Everything setup.sh does through WP-CLI that a shared host cannot: create the two
 * Polylang languages and run the seed. Installing the plugins and setting permalinks
 * stays in the hands of whoever installs WordPress, because wp-admin already does
 * both well.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class Terra_Admin {

	const PAGE   = 'terra-demo-content';
	const ACTION = 'terra_seed';

	public static function register() {
		add_management_page(
			__( 'Terra demo content', 'terra-realestate' ),
			__( 'Terra demo content', 'terra-realestate' ),
			'manage_options',
			self::PAGE,
			array( __CLASS__, 'render' )
		);
	}

	/** The languages the seed assumes exist; setup.sh creates these over WP-CLI. */
	private static function ensure_languages() {
		if ( ! function_exists( 'PLL' ) || ! PLL()->model ) {
			throw new RuntimeException(
				__( 'Polylang is not active. Install and activate it before seeding.', 'terra-realestate' )
			);
		}

		$wanted = array(
			array( 'name' => 'English',    'slug' => 'en', 'locale' => 'en_US', 'term_group' => 0 ),
			array( 'name' => 'Português',  'slug' => 'pt', 'locale' => 'pt_BR', 'term_group' => 1 ),
		);

		foreach ( $wanted as $language ) {
			// Adding a language that already exists returns a WP_Error, which is not a
			// failure here: the point is that it exists afterwards, not that we made it.
			if ( PLL()->model->get_language( $language['slug'] ) ) {
				Terra_Seed_Output::log( sprintf( 'Language already present: %s', $language['slug'] ) );
				continue;
			}

			$result = PLL()->model->languages->add( $language );

			if ( is_wp_error( $result ) ) {
				throw new RuntimeException(
					sprintf( 'Could not create language %s: %s', $language['slug'], $result->get_error_message() )
				);
			}

			Terra_Seed_Output::log( sprintf( 'Created language: %s', $language['slug'] ) );
		}
	}

	/** Seeding writes a lot of posts and draws images; give it room on slow hosts. */
	private static function run_seed() {
		@set_time_limit( 300 );

		self::ensure_languages();

		require __DIR__ . '/../dev/seed.php';
	}

	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to seed demo content.', 'terra-realestate' ) );
		}

		$output = array();
		$error  = '';

		if ( isset( $_POST[ self::ACTION ] ) && check_admin_referer( self::ACTION ) ) {
			try {
				self::run_seed();
			} catch ( Throwable $e ) {
				// A half-finished seed is safe to leave: it is idempotent, so the next
				// run picks up where this one stopped rather than duplicating anything.
				$error = $e->getMessage();
			}

			$output = Terra_Seed_Output::flush();
		}

		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Terra demo content', 'terra-realestate' ); ?></h1>

			<p>
				<?php esc_html_e(
					'Creates the English and Portuguese languages, then the demo listings and neighborhood articles in both. Safe to run more than once: posts are never duplicated, and their fields are refreshed to match the seed file.',
					'terra-realestate'
				); ?>
			</p>

			<?php if ( $error ) : ?>
				<div class="notice notice-error"><p><?php echo esc_html( $error ); ?></p></div>
			<?php endif; ?>

			<?php if ( $output ) : ?>
				<h2><?php esc_html_e( 'Output', 'terra-realestate' ); ?></h2>
				<pre style="max-height:24em;overflow:auto;background:#fff;border:1px solid #c3c4c7;padding:1em"><?php
					echo esc_html( implode( "\n", $output ) );
				?></pre>
			<?php endif; ?>

			<form method="post">
				<?php wp_nonce_field( self::ACTION ); ?>
				<p>
					<button type="submit" name="<?php echo esc_attr( self::ACTION ); ?>" value="1" class="button button-primary">
						<?php esc_html_e( 'Seed demo content', 'terra-realestate' ); ?>
					</button>
				</p>
			</form>
		</div>
		<?php
	}
}
