<?php
/**
 * Plugin Name: Terra Real Estate
 * Description: Headless real estate backend: property CPT, ACF fields, and GraphQL exposure for a Next.js frontend.
 * Version: 0.1.0
 * Author: Nick Granados
 * Text Domain: terra-realestate
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

require_once __DIR__ . '/includes/class-cpt.php';

add_action( 'init', array( 'Terra_CPT', 'register' ) );
