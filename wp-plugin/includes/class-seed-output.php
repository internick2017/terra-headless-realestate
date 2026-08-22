<?php
/**
 * Where the seeder's output goes.
 *
 * The seed used to speak WP_CLI directly and refuse to run without it, which
 * quietly made the whole project undeployable anywhere without shell access —
 * and shared hosting, which is exactly where a demo like this ends up, does not
 * give you one. The seeding logic is unchanged; only its voice is now pluggable,
 * so the same file backs the WP-CLI command and the admin button.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class Terra_Seed_Output {

	/** @var string[] Lines collected when there is no WP-CLI to print them. */
	private static $lines = array();

	private static function running_in_cli() {
		return defined( 'WP_CLI' ) && WP_CLI;
	}

	public static function log( $message ) {
		if ( self::running_in_cli() ) {
			WP_CLI::log( $message );
			return;
		}

		self::$lines[] = $message;
	}

	public static function warning( $message ) {
		if ( self::running_in_cli() ) {
			WP_CLI::warning( $message );
			return;
		}

		self::$lines[] = 'Warning: ' . $message;
	}

	public static function success( $message ) {
		if ( self::running_in_cli() ) {
			WP_CLI::success( $message );
			return;
		}

		self::$lines[] = 'Success: ' . $message;
	}

	/**
	 * A failure the seed cannot continue past. Under WP-CLI this exits, which is
	 * the behaviour the command has always had; in the browser it throws, so the
	 * admin page can catch it and show what went wrong instead of a white screen.
	 */
	public static function error( $message ) {
		if ( self::running_in_cli() ) {
			WP_CLI::error( $message );
			return;
		}

		throw new RuntimeException( $message );
	}

	/** Everything said since the last reset, for the admin page to render. */
	public static function flush() {
		$lines = self::$lines;
		self::$lines = array();

		return $lines;
	}
}
