Feature: Chronicle on the sheet

  @pending
  Scenario: A chronicle is written while editing
    Given a saved character named "Lucita"
    When the player edits "Lucita" and enters the chronicle "The Glass City"
    And they reload the sheet and edit it again
    Then the Chronicle field holds "The Glass City"

  @pending
  Scenario: A stored chronicle is offered for editing
    Given a saved character named "Lucita" with chronicle "The Glass City"
    When the player edits "Lucita"
    Then the Chronicle field holds "The Glass City"

  @pending
  Scenario: A chronicle can be cleared
    Given a saved character named "Lucita" with chronicle "The Glass City"
    When the player edits "Lucita" and clears the chronicle
    And they reload the sheet and edit it again
    Then the Chronicle field is empty

  @pending
  Scenario: Play mode does not show the chronicle
    Given a saved character named "Lucita" with chronicle "The Glass City"
    When the player opens "Lucita" in play mode
    Then no Chronicle field is offered
    And "The Glass City" appears nowhere on the sheet

  @pending
  Scenario: Looking at the edit fields changes nothing
    Given a saved character named "Lucita" with chronicle "The Glass City"
    When the player edits "Lucita" and leaves edit mode without typing
    Then every stored record is exactly as it was
