Feature: The builder's navigation keeps to the browser's habits

  The sidebar and the footer route their own clicks, so the cases the browser has a say in are
  held here: a link opened in a window of its own, the browser's Back while a dialog or the
  "build not found" message is up, and a reason said for one screen not outliving it.

  Scenario: A reason said for one screen is not left behind on another
    Given a build where no clan is chosen
    And I am on the Clan screen
    When I focus Continue with the keyboard and press Enter
    Then Continue has said its reason
    When I choose Advantages in the sidebar
    Then nothing is said politely about Continue

  Scenario: A sidebar link opened in a window of its own is left to the browser
    Given a build with nothing placed
    And I am on the Character concept screen
    When I choose Clan in the sidebar holding Shift
    Then the link opened in a window of its own
    And the Character concept screen is shown

  Scenario: Browser Back does not move the screen behind an open dialog
    Given a build with nothing placed
    And I am on the Character concept screen
    When I choose Clan in the sidebar
    And I open Creation settings
    And I use the browser Back button
    Then the Clan screen is shown
    And the Creation settings dialog is still open
    And the address names Clan

  Scenario: Browser Back does not draw the builder over "build not found"
    Given a build named "Lucita" of clan "Lasombra"
    And I am on the Clan screen
    And the same build has been removed in another tab
    When they set the base generation to "10th"
    And I use the browser Back button
    Then they see a "build not found" message with a link to the roster
    And the page title names Clan
