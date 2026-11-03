<?php
declare(strict_types=1);

// ============================================================================
// 12. Learning Workspace (PDF, AI, Notes, Flashcards) & Bombstyle Arena
// ============================================================================
if (handle_learning_workspace_routes($route, $method, $user)) {
    exit;
}

arena_routes($route, $method, $user);
